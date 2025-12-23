const PreoperationalRecord = require('../models/PreoperationalRecord');
const WorkCalendar = require('../models/WorkCalendar');
const { getValues, updateRange } = require('./googleSheetsService');

const REVIEW_SHEET_ID = process.env.REVIEW_REPORT_FILE_ID;

const MONTH_NAMES = {
  1: 'ENERO',
  2: 'FEBRERO',
  3: 'MARZO',
  4: 'ABRIL',
  5: 'MAYO',
  6: 'JUNIO',
  7: 'JULIO',
  8: 'AGOSTO',
  9: 'SEPTIEMBRE',
  10: 'OCTUBRE',
  11: 'NOVIEMBRE',
  12: 'DICIEMBRE',
};

function getSheetName(year, month) {
  return `${MONTH_NAMES[month]}_${year}`;
}

function normalize(str) {
  return (str ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Buscar fila por ID USUARIO en la hoja de revisión.
 * Si existe, devuelve el índice de fila (2,3,...).
 * Si no, devuelve la siguiente fila libre.
 */
async function findOrCreateRowForUser(tokens, sheetName, userId, userName) {
  // Columna K = ID USUARIO (desde fila 2)
  const rows = await getValues(tokens, REVIEW_SHEET_ID, `${sheetName}!K2:K200`);
  const normUserId = normalize(String(userId));

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] || [];
    const sheetUserId = normalize(String(row[0] || ''));

    if (sheetUserId === normUserId) {
      const rowIndex = i + 2; // +2 porque empezamos en K2
      console.log(` Usuario encontrado en fila ${rowIndex}: ID ${userId}`);
      return rowIndex;
    }
  }

  const nextRow = rows.length + 2;
  console.log(` Creando nueva fila ${nextRow} para ${userName} (ID: ${userId})`);
  return nextRow;
}

async function getWorkingDaysInMonth(userId, year, month, calendar) {
  const workingDays = [];
  const lastDay = new Date(year, month, 0).getDate();

  for (let day = 1; day <= lastDay; day++) {
    const date = new Date(year, month - 1, day);
    const dateString = date.toISOString().split('T')[0];

    if (date.getDay() === 0) continue; // domingos

    const isNonWorking = (calendar.nonWorkingDays || []).includes(dateString);
    if (!isNonWorking) workingDays.push(dateString);
  }

  return workingDays;
}

function detectBadItems(formData) {
  const badItems = [];

  const descripcionDirecta =
    formData?.OBJETOS_MAL_ESTADO_DESCRIPCION ||
    formData?.POSEE_ALGUN_OBJETO_EN_MAL_ESTADO_ESPECIFIQUE_CUAL;

  if (
    descripcionDirecta &&
    descripcionDirecta.trim() !== '' &&
    descripcionDirecta.trim() !== 'NO' &&
    descripcionDirecta.trim() !== 'NINGUNO'
  ) {
    badItems.push(descripcionDirecta.trim());
  }

  const checkFields = {
    RETROVISORES: ['MALO', 'REGULAR'],
    RETROVISORES_ESPEJOS: ['MALO', 'REGULAR'],
    PITO: ['MALO', 'REGULAR'],
    DIRECCIONALES: ['MALAS', 'REGULARES'],
    LUZ_DELANTERA: ['MALA', 'REGULAR'],
    LUZ_TRASERA: ['MALA', 'REGULAR'],
    LUZ_FRENO: ['MALA', 'REGULAR'],
    LUZ_DE_FRENO: ['MALA', 'REGULAR'],
    FRENO_DELANTERO: ['MALO', 'REGULAR'],
    FRENO_TRASERO: ['MALO', 'REGULAR'],
    LLANTA_TRASERA: ['MALA', 'REGULAR'],
    LLANTA_DELANTERA: ['MALA', 'REGULAR'],
    SISTEMA_TRANSMISION: ['MALO', 'REGULAR'],
    SISTEMA_DE_TRANSMISION_DE_FUERZA: ['MALO', 'REGULAR'],
    VELOCIMETRO: ['MALO'],
    CASCO: ['MALO'],
    TABLERO_INSTRUMENTOS: ['MALO', 'REGULAR'],
    ESTADO_LLANTAS: ['MALAS', 'REGULARES'],
    SISTEMA_LUCES: ['MALO', 'REGULAR'],
    KIT_CARRETERA: ['INCOMPLETO'],
    LLANTAS_REPUESTO: ['MALA', 'REGULAR', 'NO TIENE'],
    LIMPIA_BRISAS: ['MALO', 'REGULAR'],
    FRENOS: ['MALOS', 'REGULARES'],
    ESPEJOS: ['MALOS', 'REGULARES'],
    CINTURONES: ['MALOS', 'REGULARES'],
  };

  for (const [field, badValues] of Object.entries(checkFields)) {
    const value = formData?.[field];
    if (value && badValues.includes(value.toUpperCase())) {
      badItems.push(`${field}: ${value}`);
    }
  }

  if (
    formData?.COMPONENTE_MAL_ESTADO === 'SI' ||
    formData?.ALGUN_COMPONENTE_EN_MAL_ESTADO_O_POR_CAMBIAR === 'SI'
  ) {
    badItems.push('Componente por cambiar');
  }

  if (
    formData?.DERRAME_FLUIDOS === 'SI' ||
    formData?.DERRAME_DE_FLUIDOS === 'SI'
  ) {
    badItems.push('Derrame de fluidos');
  }

  if (formData?.FUGAS_FLUIDOS === 'SI') {
    badItems.push('Fugas de fluidos');
  }

  return badItems;
}

function fechasAListaDiasString(fechasISO) {
  const dias = Array.from(
    new Set(
      (fechasISO || [])
        .map(f => {
          const p = String(f).split('-');
          return p.length === 3 ? parseInt(p[2], 10) : null;
        })
        .filter(n => Number.isInteger(n))
    )
  ).sort((a, b) => a - b);

  return dias.length ? dias.join('-') : '-';
}

/**
 * Actualizar hoja de revisión (una fila por usuario/mes)
 */
async function updateReviewSheetNewFormat(tokens, stats) {
  if (!REVIEW_SHEET_ID) {
    console.warn('REVIEW_REPORT_FILE_ID no definido');
    return;
  }

  const sheetName = getSheetName(stats.year, stats.month);
  console.log(` Actualizando informe: hoja ${sheetName}`);

  const rowIndex = await findOrCreateRowForUser(
    tokens,
    sheetName,
    stats.userId,
    stats.userName
  );

  const diasHabiles = stats.totalWorkingDays;
  const diasRegistradosStr = fechasAListaDiasString(stats.registeredDaysList);
  const diasFaltantesStr = fechasAListaDiasString(stats.missingDaysList);

  const itemsMalEstado =
    (stats.itemsInBadState || [])
      .map(entry => {
        const dia = entry.date.split('-')[2];
        return `${dia}:${entry.items.join('/')}`;
      })
      .join(' | ') || '-';

  const mantenimiento = stats.mantenimientoConsolidado || '-';
  const soporte = stats.soporteConsolidado || '-';
  const recibo = stats.reciboConsolidado || '-';
  const correos = stats.correosConsolidado || '-';

  const rangeA_H = `${sheetName}!A${rowIndex}:H${rowIndex}`;
  const valuesA_H = [
    [
      stats.userName,      // A: NOMBRE
      correos,             // B: CORREO(S)
      itemsMalEstado,      // C: ITEM EN MAL ESTADO
      diasHabiles,         // D: DÍAS HÁBILES
      diasRegistradosStr,  // E: DÍAS REGISTRADOS
      diasFaltantesStr,    // F: DÍAS FALTANTES
      mantenimiento,       // G: MANTENIMIENTO
      soporte,             // H: SOPORTE
    ],
  ];

  const rangeJ_K = `${sheetName}!J${rowIndex}:K${rowIndex}`;
  const valuesJ_K = [
    [
      recibo,        // J: RECIBO
      stats.userId,  // K: ID USUARIO
    ],
  ];

  await updateRange(tokens, REVIEW_SHEET_ID, rangeA_H, valuesA_H);
  await updateRange(tokens, REVIEW_SHEET_ID, rangeJ_K, valuesJ_K);

  console.log('RANGO A_H:', rangeA_H, JSON.stringify(valuesA_H));
  console.log('RANGO J_K:', rangeJ_K, JSON.stringify(valuesJ_K));

  console.log(` Fila ${rowIndex} actualizada para ${stats.userName} (ID: ${stats.userId})`);
  console.log(`  Correos: ${correos}`);
  console.log(`  Items mal estado: ${itemsMalEstado}`);
  console.log(`  Días registrados: ${diasRegistradosStr}`);
  console.log(`  Días faltantes: ${diasFaltantesStr}`);
  console.log(`  Mantenimiento: ${mantenimiento}`);
  console.log(`  Soporte: ${soporte}`);
  console.log(`  Recibo: ${recibo}`);
}

async function syncUserMonthReview(tokens, userId, userName, year, month) {
  console.log(` Sync revisión: ${userName} (${userId}) - ${year}/${month}`);

  const calendar = await WorkCalendar.findOne({ userId, year, month });
  if (!calendar) {
    return { success: false, message: 'No hay calendario configurado para este mes' };
  }

  const workingDays = await getWorkingDaysInMonth(userId, year, month, calendar);

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(
    lastDay
  ).padStart(2, '0')}`;

  const records = await PreoperationalRecord.find({
    userId,
    date: { $gte: startDate, $lte: endDate },
  }).lean();

  const registeredDaysList = [];
  const lateDaysList = [];
  const missingDaysList = [];
  const itemsInBadState = [];

  const mantenimientos = [];
  const soportes = [];
  const recibos = [];
  const correos = [];

  for (const day of workingDays) {
    const record = records.find(r => r.date === day);

    if (record) {
      if (record.status === 'completado' || record.status === 'entregado_tarde') {
        registeredDaysList.push(day);
      }
      if (record.status === 'entregado_tarde' || record.wasLate) {
        lateDaysList.push(day);
      }

      if (record.formData) {
        const badItems = detectBadItems(record.formData);
        if (badItems.length) {
          itemsInBadState.push({ date: day, items: badItems });
        }

        const mantenimientoReporte =
          record.formData.REPORTE_DE_MANTENIMIENTOS_CORRECTIVOS_Y_PREVENTIVOS_REALIZADOS_EN_EL_MES ||
          record.formData.REPORTE_MANTENIMIENTOS;

        const descripcionMantenimiento =
          record.formData.DESCRIPCION_DEL_MANTENIMIENTO ||
          record.formData.DESCRIPCION;

        if (
          mantenimientoReporte === 'SI' &&
          descripcionMantenimiento &&
          descripcionMantenimiento !== 'NO APLICA'
        ) {
          const dia = day.split('-')[2];
          mantenimientos.push(`${dia}: ${descripcionMantenimiento}`);
        }

        const soporteFacturas =
          record.formData.ADJUNTAR_SOPORTES_FACTURAS ||
          record.formData.ADJUNTAR_SOPORTES ||
          record.formData.REPORTE_ADJUNTO ||
          record.formData.ADJUNTA_ALGUN_REPORTE_ARCHIVO_O_ENLACE;

        if (
          soporteFacturas &&
          soporteFacturas !== 'N/A' &&
          soporteFacturas !== 'NO APLICA' &&
          soporteFacturas.trim() !== ''
        ) {
          const dia = day.split('-')[2];
          soportes.push(`${dia}: ${soporteFacturas}`);
        }

        const reciboReferencia =
          record.formData.ANEXE_RECIBO_EN_CASO_DE_TENER_ARCHIVO_O_ENLACE ||
          record.formData.RECIBO_REFERENCIA;

        if (
          reciboReferencia &&
          reciboReferencia !== 'N/A' &&
          reciboReferencia !== 'NO APLICA' &&
          reciboReferencia.trim() !== ''
        ) {
          const dia = day.split('-')[2];
          recibos.push(`${dia}: ${reciboReferencia}`);
        }

        const correo =
          record.formData.CORREO ||
          record.formData.INGRESE_SU_CORREO;

        if (correo && correo.trim() !== '') {
          const dia = day.split('-')[2];
          correos.push(`${dia}: ${correo}`);
        }
      }
    } else {
      const hoy = new Date().toISOString().split('T')[0];
      if (day <= hoy) missingDaysList.push(day);
    }
  }

  const mantenimientoConsolidado =
    mantenimientos.length > 0 ? mantenimientos.join(' | ') : '-';
  const soporteConsolidado =
    soportes.length > 0 ? soportes.join(' | ') : '-';
  const reciboConsolidado =
    recibos.length > 0 ? recibos.join(' | ') : '-';
  const correosConsolidado =
    correos.length > 0 ? correos.join(' | ') : '-';

  const stats = {
    userId,
    userName,
    year,
    month,
    monthName: MONTH_NAMES[month],
    totalWorkingDays: workingDays.length,
    registeredDays: registeredDaysList.length,
    lateDays: lateDaysList.length,
    missingDays: missingDaysList.length,
    itemsInBadStateCount: itemsInBadState.length,
    complianceRate:
      workingDays.length > 0
        ? ((registeredDaysList.length / workingDays.length) * 100).toFixed(2)
        : '0.00',
    workingDaysList: workingDays,
    registeredDaysList,
    lateDaysList,
    missingDaysList,
    itemsInBadState,
    mantenimientoConsolidado,
    soporteConsolidado,
    reciboConsolidado,
    correosConsolidado,
  };

  if (tokens && REVIEW_SHEET_ID) {
    await updateReviewSheetNewFormat(tokens, stats);
  }

  return { success: true, stats };
}

async function getUserMonthStatsFromDB(userId, userName, year, month) {
  const calendar = await WorkCalendar.findOne({ userId, year, month });
  if (!calendar) {
    return null;
  }

  const workingDays = await getWorkingDaysInMonth(userId, year, month, calendar);

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(
    lastDay
  ).padStart(2, '0')}`;

  const records = await PreoperationalRecord.find({
    userId,
    date: { $gte: startDate, $lte: endDate },
  }).lean();

  const registeredDaysList = [];
  const lateDaysList = [];
  const missingDaysList = [];
  const lateDetails = [];
  const itemsInBadState = [];

  for (const day of workingDays) {
    const record = records.find(r => r.date === day);

    if (record) {
      if (record.status === 'completado' || record.status === 'entregado_tarde') {
        registeredDaysList.push(day);
      }
      if (record.status === 'entregado_tarde' || record.wasLate) {
        lateDaysList.push(day);
        if (record.deliveryTime) {
          const t = new Date(record.deliveryTime);
          lateDetails.push({
            fecha: day,
            hora: t.toTimeString().slice(0, 8),
          });
        }
      }
      if (record.formData) {
        const badItems = detectBadItems(record.formData);
        if (badItems.length) itemsInBadState.push({ date: day, items: badItems });
      }
    } else {
      const hoy = new Date().toISOString().split('T')[0];
      if (day <= hoy) missingDaysList.push(day);
    }
  }

  return {
    userId,
    userName,
    year,
    month,
    totalWorkingDays: workingDays.length,
    diasRegistrados: fechasAListaDiasString(registeredDaysList),
    diasQueFaltan: fechasAListaDiasString(missingDaysList),
    totalTardanzas: lateDaysList.length,
    tardanzas: lateDetails,
    itemsInBadState,
  };
}

async function syncAllUsersForMonth(tokens, year, month) {
  const calendars = await WorkCalendar.find({ year, month });
  const results = [];

  for (const calendar of calendars) {
    try {
      const result = await syncUserMonthReview(
        tokens,
        calendar.userId,
        calendar.userName || `User ${calendar.userId}`,
        year,
        month
      );
      results.push(result);
    } catch (error) {
      results.push({
        success: false,
        userId: calendar.userId,
        error: error.message,
      });
    }
  }

  return {
    success: true,
    totalUsers: results.length,
    successCount: results.filter(r => r.success).length,
    failureCount: results.filter(r => !r.success).length,
    results,
  };
}

module.exports = {
  syncUserMonthReview,
  syncAllUsersForMonth,
  getWorkingDaysInMonth,
  getUserMonthStatsFromDB,
  fechasAListaDiasString,
};
