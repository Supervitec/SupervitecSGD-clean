const { google } = require('googleapis');
const { setCredentials } = require('../config/google-auth');
const { appendRow, getValues } = require('./googleSheetsService');

async function appendPreopResponse(tokens, fileId, payload, type) {
  try {
    console.log(' appendPreopResponse - fileId:', fileId);
    console.log(' Tipo:', type);
    console.log(' Payload keys:', Object.keys(payload));

    const sheetName = 'Respuestas de formulario 1';
    let row;

    if (type === 'carro') {
      row = [
        new Date().toISOString(), 
        payload.CONDUCTOR || '',
        payload.CORREO || payload.INGRESE_SU_CORREO || '', 
        payload.PORTA_SU_CEDULA || '',
        payload.PORTA_TARJETA_DE_PROPIEDAD || '',
        payload.PORTA_SU_LICENCIA || '',
        payload.PLACA || '',
        payload.PORTA_SU_SOAT || '',
        payload.TECNOMECANICA_VIGENTE || '',
        payload.KM_INICIAL || '',
        payload.KM_FINAL || '',
        payload.TABLERO_INSTRUMENTOS || '',
        payload.ESTADO_LLANTAS || '',
        payload.SISTEMA_LUCES || '',
        payload.KIT_CARRETERA || '',
        payload.FUGAS_FLUIDOS || '',
        payload.PITO || '',
        payload.LLANTAS_REPUESTO || '',
        payload.LIMPIA_BRISAS || '',
        payload.FRENOS || '',
        payload.ESPEJOS || '',
        payload.CINTURONES || '',
        payload.OBJETOS_MAL_ESTADO_DESCRIPCION || payload.POSEE_ALGUN_OBJETO_EN_MAL_ESTADO_ESPECIFIQUE_CUAL || '', // 🔥 MAPEO CORREGIDO
        payload.REPORTE_MANTENIMIENTOS || payload.REPORTE_DE_MANTENIMIENTOS_CORRECTIVOS_Y_PREVENTIVOS_REALIZADOS_EN_EL_MES || '',
        '', 
        payload.FECHA || '',
        payload.ADJUNTAR_SOPORTES || payload.ADJUNTAR_SOPORTES_FACTURAS || '',
        payload.DESCRIPCION || payload.DESCRIPCION_DEL_MANTENIMIENTO || '',
        payload.PICO_Y_PLACA || '',
        payload.DIA_DEL_MES || '',
        payload.DIA_SEMANA || payload.DIA_DE_LA_SEMANA || '',
        payload.MES || '',
        payload.COMPONENTE_MAL_ESTADO || payload.ALGUN_COMPONENTE_EN_MAL_ESTADO_O_POR_CAMBIAR || '',
        payload.REALIZO_ARREGLOS || '',
        payload.RECIBO_REFERENCIA || payload.ANEXE_RECIBO_EN_CASO_DE_TENER_ARCHIVO_O_ENLACE || '',
        payload.REPORTE_ADJUNTO || payload.ADJUNTA_ALGUN_REPORTE_ARCHIVO_O_ENLACE || ''
      ];
    } else if (type === 'moto') {
      row = [
        new Date().toISOString(), 
        payload.NOMBRE_CONDUCTOR || payload.NOMBRE_DEL_CONDUCTOR || '',
        payload.CORREO || payload.INGRESE_SU_CORREO || '',
        payload.PORTA_SU_CEDULA || '',
        payload.PORTA_TARJETA_DE_PROPIEDAD || '',
        payload.PORTA_SU_LICENCIA || '',
        payload.PLACA || '',
        payload.PORTA_SU_SOAT || '',
        payload.TECNOMECANICA_VIGENTE || '',
        payload.KM_INICIAL || '',
        payload.RETROVISORES || payload.RETROVISORES_ESPEJOS || '',
        payload.PITO || '',
        payload.DIRECCIONALES || '',
        payload.LUZ_DELANTERA || '',
        payload.LUZ_TRASERA || '',
        payload.LUZ_FRENO || payload.LUZ_DE_FRENO || '',
        payload.FRENO_DELANTERO || '',
        payload.FRENO_TRASERO || '',
        payload.LLANTA_TRASERA || '',
        payload.LLANTA_DELANTERA || '',
        payload.SISTEMA_TRANSMISION || payload.SISTEMA_DE_TRANSMISION_DE_FUERZA || '',
        payload.DERRAME_FLUIDOS || payload.DERRAME_DE_FLUIDOS || '',
        payload.VELOCIMETRO || '',
        payload.CASCO || '',
        payload.CHALECO || '',
        payload.OBJETOS_MAL_ESTADO_DESCRIPCION || payload.POSEE_ALGUN_OBJETO_EN_MAL_ESTADO_ESPECIFIQUE_CUAL || '', // 🔥 MAPEO CORREGIDO
        payload.REPORTE_MANTENIMIENTOS || payload.REPORTE_DE_MANTENIMIENTOS_CORRECTIVOS_Y_PREVENTIVOS_REALIZADOS_EN_EL_MES || '',
        payload.FECHA || '',
        payload.DESCRIPCION || payload.DESCRIPCION_DEL_MANTENIMIENTO || '',
        payload.ADJUNTAR_SOPORTES || payload.ADJUNTAR_SOPORTES_FACTURAS || '',
        payload.DIA_DEL_MES || '',
        payload.DIA_SEMANA || payload.DIA_DE_LA_SEMANA || '',
        payload.MES || '',
        payload.COMPONENTE_MAL_ESTADO || payload.ALGUN_COMPONENTE_EN_MAL_ESTADO_O_POR_CAMBIAR || '',
        payload.REALIZO_ARREGLOS || '',
        payload.RECIBO_REFERENCIA || payload.ANEXE_RECIBO_EN_CASO_DE_TENER_ARCHIVO_O_ENLACE || '',
        payload.REPORTE_ADJUNTO || payload.ADJUNTA_ALGUN_REPORTE_ARCHIVO_O_ENLACE || ''
      ];
    } else {
      throw new Error(`Tipo de vehículo inválido: ${type}`);
    }

    console.log(` Datos preparados: ${row.length} columnas para ${type.toUpperCase()}`);

    await appendRow(
      tokens,
      fileId,
      `${sheetName}!A:AK`, 
      row
    );

    console.log(` Respuesta guardada en Sheets (${type.toUpperCase()})`);
  } catch (error) {
    console.error(' Error guardando respuesta preop:', error.message);
    throw error;
  }
}

async function updateConsolidated(tokens, userId, date = new Date()) {
  try {
    const fileId = process.env.CONSOLIDATED_FILE_ID;
    if (!fileId) {
      console.warn('CONSOLIDATED_FILE_ID no definido');
      return;
    }

    const month = date.getMonth();
    const year = date.getFullYear();
    const sheetName = `${year}`;

    const MONTH_COL_INDEX = {
      0: 4, 1: 6, 2: 8, 3: 10, 4: 12, 5: 14,
      6: 16, 7: 18, 8: 20, 9: 22, 10: 24, 11: 26
    };

    const inspColIndex = MONTH_COL_INDEX[month];
    if (inspColIndex == null) {
      console.warn(`Índice de columna no configurado para mes ${month}`);
      return;
    }

    const rows = await getValues(tokens, fileId, `${sheetName}!A:Z`);

    const userRowIndex = rows.findIndex((row, idx) => {
      if (idx <= 5) return false;
      return String(row[0]).trim() === String(userId).trim();
    });

    if (userRowIndex === -1) {
      console.warn(`Usuario ${userId} no encontrado en consolidado`);
      return;
    }

    const currentValue = Number(rows[userRowIndex][inspColIndex] || 0);
    const newValue = currentValue + 1;

    const cellRange = `${sheetName}!${getColumnLetter(inspColIndex)}${userRowIndex + 1}`;
    const auth = setCredentials(tokens);
    const sheets = google.sheets({ version: 'v4', auth });

    await sheets.spreadsheets.values.update({
      spreadsheetId: fileId,
      range: cellRange,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[newValue]]
      }
    });

    console.log(` Consolidado actualizado: ${userId} → ${newValue} inspecciones en ${getMonthName(month)}`);
  } catch (error) {
    console.error(' Error actualizando consolidado:', error.message);
    throw error;
  }
}

function getColumnLetter(index) {
  let letter = '';
  while (index >= 0) {
    letter = String.fromCharCode((index % 26) + 65) + letter;
    index = Math.floor(index / 26) - 1;
  }
  return letter;
}

function getMonthName(monthIndex) {
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  return months[monthIndex];
}

async function getUsersFromSheet() {
  try {
    const { getAdminTokens } = require('./tokenManager');
    const tokens = getAdminTokens();

    if (!tokens) {
      throw new Error('No hay tokens de admin disponibles');
    }

    const USERS_FILE_ID = process.env.PREOP_USERS_FILE_ID;
    const rows = await getValues(tokens, USERS_FILE_ID, 'Hoja 1!A2:D');

    const users = rows.map(row => ({
      ID: row[0] || '',
      NOMBRE: row[1] || '',
      TIPO: row[2] || '',
      ACTIVO: row[3] === 'SI' || row[3] === 'TRUE' || row[3] === true
    })).filter(user => user.ID && user.NOMBRE);

    console.log(` ${users.length} usuarios cargados desde USUARIOS-PREOP`);
    return users;
  } catch (error) {
    console.error(' Error obteniendo usuarios:', error.message);
    throw error;
  }
}

/**
 * 🔥 Obtener email de un conductor por su userId
 */
async function getUserEmail(userId) {
  try {
    console.log(`🔍 Buscando email para userId: "${userId}"`);
    
    const { getAdminTokens } = require('./tokenManager');
    const tokens = getAdminTokens();
    
    if (!tokens) {
      console.error('❌ No hay tokens de admin disponibles');
      return null;
    }
    
    const { getValues } = require('./googleSheetsService');
    const USERS_FILE_ID = process.env.PREOP_USERS_FILE_ID;
    
    if (!USERS_FILE_ID) {
      console.error('❌ PREOP_USERS_FILE_ID no está definido en .env');
      return null;
    }
    
    console.log(`📊 Leyendo sheet de usuarios: ${USERS_FILE_ID}`);
    console.log(`📍 Rango: Hoja 1!A2:E200`);
    
    // Columnas: A=ID, B=NOMBRE, C=TIPO, D=ACTIVO, E=EMAIL
    const rows = await getValues(tokens, USERS_FILE_ID, 'Hoja 1!A2:E200');
    
    console.log(`📋 Total filas leídas: ${rows.length}`);
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const [id, nombre, tipo, activo, email] = row;
      
      // Debug: mostrar primeras 3 filas
      if (i < 3) {
        console.log(`   Fila ${i + 2}: ID="${id}" | NOMBRE="${nombre}" | EMAIL="${email}"`);
      }
      
      if (String(id).trim() === String(userId).trim()) {
        console.log(` MATCH ENCONTRADO en fila ${i + 2}:`);
        console.log(`   ID: "${id}"`);
        console.log(`   Nombre: "${nombre}"`);
        console.log(`   Email: "${email}"`);
        
        if (email && email.includes('@')) {
          console.log(` Email válido encontrado: ${email}`);
          return email.trim();
        } else {
          console.warn(`⚠️ Email inválido o vacío para usuario "${nombre}"`);
          return null;
        }
      }
    }
    
    console.warn(`⚠️ No se encontró userId "${userId}" en el sheet`);
    console.warn(`⚠️ Total de IDs revisados: ${rows.length}`);
    return null;
    
  } catch (error) {
    console.error('❌ Error obteniendo email de usuario:', error.message);
    console.error('   Stack:', error.stack);
    return null;
  }
}




module.exports = {
  appendPreopResponse,
  updateConsolidated,
  getUsersFromSheet,
  getUserEmail
};
