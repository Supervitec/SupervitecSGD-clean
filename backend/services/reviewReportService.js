const { google } = require('googleapis');
const { getUserMonthStatsFromDB } = require('./reviewSyncService');
const { getUserIdByName } = require('./preopUsersService'); // usa el service de usuarios [file:39]

let usersCache = null;
let cacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000;

// ================== AUTH ==================
function getOAuth2Client(tokens) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials(tokens);
  return oauth2Client;
}

// ================== MESES ==================
const MONTH_MAP = {
  ENERO: 1, FEBRERO: 2, MARZO: 3, ABRIL: 4,
  MAYO: 5, JUNIO: 6, JULIO: 7, AGOSTO: 8,
  SEPTIEMBRE: 9, OCTUBRE: 10, NOVIEMBRE: 11, DICIEMBRE: 12,
};

function parseMonthAndYear(sheetName) {
  const [mesStr, yearStr] = (sheetName || '').split('_');
  const month = MONTH_MAP[mesStr] || 1;
  const year = parseInt(yearStr, 10) || new Date().getFullYear();
  return { month, year };
}

async function getCachedUsers(tokens) {
  const now = Date.now();
  
  if (usersCache && (now - cacheTime) < CACHE_DURATION) {
    console.log('📦 Usando usuarios desde caché');
    return usersCache;
  }
  
  console.log('👥 Cargando usuarios desde Sheets...');
  const { getAllUsers } = require('./preopUsersService');
  usersCache = await getAllUsers(tokens);
  cacheTime = now;
  console.log(` ${usersCache.length} usuarios cargados y cacheados`);
  
  return usersCache;
}

// ================== GET REPORT DATA ==================
async function getReportData(tokens, filters = {}) {
  try {
    const auth = getOAuth2Client(tokens);
    const sheets = google.sheets({ version: 'v4', auth });
    const REVIEW_SHEET_ID = process.env.REVIEW_SHEET_ID;
    const sheetName = filters.month || 'DICIEMBRE_2025';

    console.log(`📖 Leyendo ${REVIEW_SHEET_ID} - Hoja: ${sheetName}`);

    
    console.log('👥 Cargando lista de usuarios...');
    const { getAllUsers } = require('./preopUsersService');
    const allUsers = await getAllUsers(tokens) || await getCachedUsers(tokens);
    console.log(` ${allUsers.length} usuarios cargados en memoria`);


    function normalizeForSearch(str) {
      return (str || '')
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/\s+/g, ' ')
        .trim();
    }

    const userMap = new Map();
    allUsers.forEach(u => {
      const key = normalizeForSearch(u.NOMBRE);
      userMap.set(key, u.ID);
    });
    console.log(`🗺 Mapa de usuarios creado`);

    // 3) Leer filas del Sheet (A2:I)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: REVIEW_SHEET_ID,
      range: `${sheetName}!A2:I`,
    });

    const rows = response.data.values || [];
    if (rows.length === 0) {
      return { conductores: [], mes: sheetName };
    }

    const { month, year } = parseMonthAndYear(sheetName);

    // 4) Base: info que ya está en el sheet
    const baseConductores = rows
      .map((row, idx) => ({
        row: idx + 2,
        nombre: row[0] || '',
        itemMalEstado: row[1] || '',
        diasHabilesSheet: row[2] || '',
        diasRegistradosSheet: row[3] || '-',
        diasFaltantesSheet: row[4] || '-',
        mantenimiento: row[5] || '',
        soporte: row[6] || '',
        observacion: row[7] || '',
        recibo: row[8] || '',
      }))
      .filter(c => c.nombre.trim() !== '');

    const conductores = [];

    // 5) Enriquecer con stats desde Mongo
    console.log(` Procesando ${baseConductores.length} conductores...`);
    
    for (const c of baseConductores) {
      let stats = null;
      let userId = null;

      try {
        // 🔥 BUSCAR EN EL MAPA (sin llamar al API)
        const normalizedName = normalizeForSearch(c.nombre);
        userId = userMap.get(normalizedName);

        if (!userId) {
          console.warn(` No se encontró userId para: ${c.nombre}`);
        } else {
          stats = await getUserMonthStatsFromDB(
            userId,
            c.nombre,
            year,
            month
          );
        }
      } catch (e) {
        console.error(` Error obteniendo stats para ${c.nombre}:`, e.message);
      }

      if (stats) {
        const faltantesStr = stats.diasQueFaltan;
        const faltasCount =
          faltantesStr === '-' ? 0 : faltantesStr.split('-').length;

        conductores.push({
          ...c,
          userId: stats.userId,
          diasHabiles: stats.totalWorkingDays,
          diasRegistrados: stats.diasRegistrados,
          diasQueFaltan: stats.diasQueFaltan,
          totalTardanzas: stats.totalTardanzas,
          tardanzas: stats.tardanzas,
          requiereCitacion:
            stats.totalTardanzas + faltasCount >= 3,
        });
      } else {
        conductores.push({
          ...c,
          userId: userId || null,
          diasHabiles: c.diasHabilesSheet,
          diasRegistrados: c.diasRegistradosSheet,
          diasQueFaltan: c.diasFaltantesSheet,
          totalTardanzas: 0,
          tardanzas: [],
          requiereCitacion: false,
        });
      }
    }

    console.log(` ${conductores.length} conductores procesados`);

    return {
      conductores,
      mes: sheetName,
      totalConductores: conductores.length,
      conductoresConTardanzas: conductores.filter(
        c => c.totalTardanzas > 0
      ).length,
    };
  } catch (error) {
    console.error(' Error getReportData:', error.message);
    throw error;
  }
}



// ================== MESES DISPONIBLES ==================
async function getMeses(tokens) {
  try {
    const auth = getOAuth2Client(tokens);
    const sheets = google.sheets({ version: 'v4', auth });
    const REVIEW_SHEET_ID = process.env.REVIEW_SHEET_ID;

    console.log(` Obteniendo pestañas de ${REVIEW_SHEET_ID}`);

    const response = await sheets.spreadsheets.get({
      spreadsheetId: REVIEW_SHEET_ID,
      fields: 'sheets(properties(title))',
    });

    const meses = response.data.sheets
      .map(sheet => sheet.properties.title)
      .filter(title => title.includes('_202'));

    console.log(`Meses encontrados: ${meses.join(', ')}`);
    return meses;
  } catch (error) {
    console.error('Error getMeses:', error.message);
    throw error;
  }
}

// ================== UPDATES ==================
async function updateObservacion(tokens, data) {
  try {
    const auth = getOAuth2Client(tokens);
    const sheets = google.sheets({ version: 'v4', auth });
    const REVIEW_SHEET_ID = process.env.REVIEW_SHEET_ID;

    const { mes, fila, valor } = data;
    const range = `${mes}!H${fila}`; // 🔥 CAMBIÓ DE F a H

    console.log(`Actualizando ${range} → ${valor}`);

    await sheets.spreadsheets.values.update({
      spreadsheetId: REVIEW_SHEET_ID,
      range,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [[valor]] },
    });

    return { success: true };
  } catch (error) {
    console.error('Error updateObservacion:', error.message);
    throw error;
  }
}

async function updateMantenimientos(tokens, data) {
  try {
    const auth = getOAuth2Client(tokens);
    const sheets = google.sheets({ version: 'v4', auth });
    const REVIEW_SHEET_ID = process.env.REVIEW_SHEET_ID;

    const { mes, fila, valor } = data;
    const range = `${mes}!F${fila}`; // 🔥 CAMBIÓ DE D a F

    console.log(`Actualizando mantenimientos ${range} → ${valor}`);

    await sheets.spreadsheets.values.update({
      spreadsheetId: REVIEW_SHEET_ID,
      range,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [[valor]] },
    });

    return { success: true };
  } catch (error) {
    console.error('Error updateMantenimientos:', error.message);
    throw error;
  }
}

async function updateRecibos(tokens, data) {
  try {
    const auth = getOAuth2Client(tokens);
    const sheets = google.sheets({ version: 'v4', auth });
    const REVIEW_SHEET_ID = process.env.REVIEW_SHEET_ID;

    const { mes, fila, valor } = data;
    const range = `${mes}!I${fila}`; 

    console.log(`Actualizando recibos ${range} → ${valor}`);

    await sheets.spreadsheets.values.update({
      spreadsheetId: REVIEW_SHEET_ID,
      range,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [[valor]] },
    });

    return { success: true };
  } catch (error) {
    console.error('Error updateRecibos:', error.message);
    throw error;
  }
}


module.exports = {
  getMeses,
  getReportData,
  updateObservacion,
  updateMantenimientos,
  updateRecibos,
};
