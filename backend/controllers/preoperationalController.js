const {
  appendPreopResponse,
  getUsersFromSheet
} = require('../services/preoperationalService');

const PreoperationalRecord = require('../models/PreoperationalRecord');
const UserSanction = require('../models/UserSanction');
const WorkCalendar = require('../models/WorkCalendar');
const emailNotificationService = require('../services/emailNotificationService');
const preoperationalService = require('../services/preoperationalService');
const { syncUserMonthReview, syncAllUsersForMonth } = require('../services/reviewSyncService');
const { getAdminTokens } = require('../services/tokenManager');

const MOTO_FILE_ID = process.env.MOTO_FORM_FILE_ID;
const CAR_FILE_ID = process.env.CAR_FORM_FILE_ID;

function resolveFileId(type) {
  if (type === 'moto') return MOTO_FILE_ID;
  if (type === 'carro') return CAR_FILE_ID;
  throw new Error('Tipo inválido de preoperacional');
}

/**
 * Obtener hora actual de Colombia
 */
function getColombiaTime() {
  const now = new Date();
  console.log('⏰ getColombiaTime() devuelve:', now.toLocaleString('es-CO', { timeZone: 'America/Bogota' }));
  return now;
}

/**
 * Verificar si un día es laboral
 * dateString: 'YYYY-MM-DD'
 */
const isWorkingDay = async (userId, dateString) => {
  try {
    console.log(` Verificando ${dateString} para userId: ${userId}`);
    const [yearStr, monthStr, dayStr] = dateString.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const dateObj = new Date(year, month - 1, parseInt(dayStr, 10));

    if (dateObj.getDay() === 0) {
      console.log(`  ${dateString}: DOMINGO (NO laboral)`);
      return false;
    }

    console.log(`  Buscando calendario: userId=${userId}, year=${year}, month=${month}`);
    const calendar = await WorkCalendar.findOne({ userId, year, month });

    if (!calendar) {
      console.log(`  Sin calendario para ${userId}/${year}/${month} → Asumiendo LABORAL`);
      return true;
    }

    console.log(`  Calendario encontrado, nonWorkingDays:`, calendar.nonWorkingDays);
    const isNonWorking = calendar.nonWorkingDays.includes(dateString);
    console.log(`  ${dateString}: ${isNonWorking ? 'NO laboral' : 'LABORAL'}`);
    return !isNonWorking;
  } catch (error) {
    console.error(' Error isWorkingDay:', error);
    return true;
  }
};

// ==================== FORMULARIOS COMPLETOS ====================

/**
 * GET /api/preop/form/:type
 * Obtener definición del formulario según tipo 
 */
exports.getForm = async (req, res) => {
  try {
    const { type } = req.params;
    const fileId = resolveFileId(type);

    let fields = [];

    if (type === 'moto') {
      fields = [
        { label: 'Nombre del Conductor', type: 'text', name: 'NOMBRE_CONDUCTOR', required: true },
        { label: 'Ingrese su correo', type: 'text', name: 'CORREO', required: true, placeholder: 'ejemplo@correo.com' },
        { label: 'Porta su cédula', type: 'select', name: 'PORTA_SU_CEDULA', options: ['SI', 'NO'], required: true },
        { label: 'Porta tarjeta de propiedad', type: 'select', name: 'PORTA_TARJETA_DE_PROPIEDAD', options: ['SI', 'NO'], required: true },
        { label: 'Porta su licencia', type: 'select', name: 'PORTA_SU_LICENCIA', options: ['SI', 'NO'], required: true },
        { label: 'Placa', type: 'text', name: 'PLACA', required: true },
        { label: 'Porta su SOAT', type: 'select', name: 'PORTA_SU_SOAT', options: ['SI', 'NO'], required: true },
        { label: 'Tecnomecánica vigente', type: 'select', name: 'TECNOMECANICA_VIGENTE', options: ['SI', 'NO'], required: true },
        { label: 'KM inicial', type: 'number', name: 'KM_INICIAL', required: true },
        { label: 'Retrovisores (Espejos)', type: 'select', name: 'RETROVISORES', options: ['BUENO', 'MALO', 'REGULAR'], required: true },
        { label: 'Pito', type: 'select', name: 'PITO', options: ['BUENO', 'MALO', 'REGULAR'], required: true },
        { label: 'Direccionales', type: 'select', name: 'DIRECCIONALES', options: ['BUENAS', 'MALAS', 'REGULARES'], required: true },
        { label: 'Luz delantera', type: 'select', name: 'LUZ_DELANTERA', options: ['BUENA', 'MALA', 'REGULAR'], required: true },
        { label: 'Luz trasera', type: 'select', name: 'LUZ_TRASERA', options: ['BUENA', 'MALA', 'REGULAR'], required: true },
        { label: 'Luz de freno', type: 'select', name: 'LUZ_FRENO', options: ['BUENA', 'MALA', 'REGULAR'], required: true },
        { label: 'Freno delantero', type: 'select', name: 'FRENO_DELANTERO', options: ['BUENO', 'MALO', 'REGULAR'], required: true },
        { label: 'Freno trasero', type: 'select', name: 'FRENO_TRASERO', options: ['BUENO', 'MALO', 'REGULAR'], required: true },
        { label: 'Llanta trasera', type: 'select', name: 'LLANTA_TRASERA', options: ['BUENA', 'MALA', 'REGULAR'], required: true },
        { label: 'Llanta delantera', type: 'select', name: 'LLANTA_DELANTERA', options: ['BUENA', 'MALA', 'REGULAR'], required: true },
        { label: 'Sistema de transmisión de fuerza', type: 'select', name: 'SISTEMA_TRANSMISION', options: ['BUENO', 'MALO', 'REGULAR'], required: true },
        { label: 'Derrame de fluidos', type: 'select', name: 'DERRAME_FLUIDOS', options: ['SI', 'NO'], required: true },
        { label: 'Velocímetro', type: 'select', name: 'VELOCIMETRO', options: ['BUENO', 'MALO', 'REGULAR'], required: true },
        { label: 'Casco', type: 'select', name: 'CASCO', options: ['BUENO', 'MALO'], required: true },
        { label: 'Chaleco', type: 'select', name: 'CHALECO', options: ['SI', 'NO'], required: true },
        { label: '¿Posee algún objeto en mal estado? (especifique cuál)', type: 'textarea', name: 'OBJETOS_MAL_ESTADO_DESCRIPCION', required: false, placeholder: 'Ej: Espejo retrovisor roto, llanta delantera desgastada...' },
        { label: 'Reporte de mantenimientos correctivos y preventivos realizados en el mes', type: 'select', name: 'REPORTE_MANTENIMIENTOS', options: ['SI', 'NO'], required: false },
        { label: 'Fecha de mantenimiento', type: 'date', name: 'FECHA', required: false },
        { label: 'Descripción del mantenimiento', type: 'textarea', name: 'DESCRIPCION', required: false },
        { label: 'Adjuntar soportes (facturas)', type: 'text', name: 'ADJUNTAR_SOPORTES', placeholder: 'URL o referencia', required: false },
        { label: 'Día del mes', type: 'number', name: 'DIA_DEL_MES', required: false },
        { label: 'Día de la semana', type: 'text', name: 'DIA_SEMANA', required: false },
        { label: 'Mes', type: 'text', name: 'MES', required: false },
        { label: '¿Algún componente en mal estado o por cambiar?', type: 'select', name: 'COMPONENTE_MAL_ESTADO', options: ['NO', 'SI'], required: false },
        { label: '¿Realizó arreglos?', type: 'select', name: 'REALIZO_ARREGLOS', options: ['NO', 'SI'], required: false },
        { label: 'Anexe recibo en caso de tener (archivo o enlace)', type: 'text', name: 'RECIBO_REFERENCIA', required: false, placeholder: 'URL o referencia del recibo' },
        { label: '¿Adjunta algún reporte? (archivo o enlace)', type: 'text', name: 'REPORTE_ADJUNTO', required: false, placeholder: 'URL o referencia del reporte' }
      ];
    } else if (type === 'carro') {
      fields = [
        { label: 'Conductor', type: 'text', name: 'CONDUCTOR', required: true },
        { label: 'Ingrese su correo', type: 'text', name: 'CORREO', required: true, placeholder: 'ejemplo@correo.com' },
        { label: 'Porta su cédula', type: 'select', name: 'PORTA_SU_CEDULA', options: ['SI', 'NO'], required: true },
        { label: 'Porta tarjeta de propiedad', type: 'select', name: 'PORTA_TARJETA_DE_PROPIEDAD', options: ['SI', 'NO'], required: true },
        { label: 'Porta su licencia', type: 'select', name: 'PORTA_SU_LICENCIA', options: ['SI', 'NO'], required: true },
        { label: 'Placa', type: 'text', name: 'PLACA', required: true },
        { label: 'Porta su SOAT', type: 'select', name: 'PORTA_SU_SOAT', options: ['SI', 'NO'], required: true },
        { label: 'Tecnomecánica vigente', type: 'select', name: 'TECNOMECANICA_VIGENTE', options: ['SI', 'NO'], required: true },
        { label: 'KM inicial', type: 'number', name: 'KM_INICIAL', required: true },
        { label: 'KM final', type: 'number', name: 'KM_FINAL', required: false },
        { label: 'Tablero de instrumentos: Velocímetro, gasolina, direccionales, temperatura, luces', type: 'select', name: 'TABLERO_INSTRUMENTOS', options: ['BUENO', 'MALO', 'REGULAR'], required: true },
        { label: 'Estado de las llantas', type: 'select', name: 'ESTADO_LLANTAS', options: ['BUENAS', 'MALAS', 'REGULARES'], required: true },
        { label: 'Sistema de luces', type: 'select', name: 'SISTEMA_LUCES', options: ['BUENO', 'MALO', 'REGULAR'], required: true },
        { label: 'Kit de carretera: Gato, cruceta, herramientas, triángulos, tacos, llanta de repuesto, extintor, linterna, botiquín, conos', type: 'select', name: 'KIT_CARRETERA', options: ['COMPLETO', 'INCOMPLETO'], required: true },
        { label: 'Presencia de fugas de fluidos, defectos o daños', type: 'select', name: 'FUGAS_FLUIDOS', options: ['SI', 'NO'], required: true },
        { label: 'Pito', type: 'select', name: 'PITO', options: ['BUENO', 'MALO', 'REGULAR'], required: true },
        { label: 'Llantas de repuesto', type: 'select', name: 'LLANTAS_REPUESTO', options: ['BUENA', 'MALA', 'REGULAR', 'NO TIENE'], required: true },
        { label: 'Limpiaparabrisas', type: 'select', name: 'LIMPIA_BRISAS', options: ['BUENO', 'MALO', 'REGULAR'], required: true },
        { label: 'Frenos: Hacer prueba de frenado', type: 'select', name: 'FRENOS', options: ['BUENOS', 'MALOS', 'REGULARES'], required: true },
        { label: 'Espejos: Limpios y libres de daños, bien ajustados y máxima visibilidad', type: 'select', name: 'ESPEJOS', options: ['BUENOS', 'MALOS', 'REGULARES'], required: true },
        { label: 'Estado y funcionamiento de los cinturones de seguridad', type: 'select', name: 'CINTURONES', options: ['BUENOS', 'MALOS', 'REGULARES'], required: true },
        { label: '¿Posee algún objeto en mal estado? (especifique cuál)', type: 'textarea', name: 'OBJETOS_MAL_ESTADO_DESCRIPCION', required: false, placeholder: 'Ej: Espejo lateral derecho roto, freno delantero con ruido...' },
        { label: 'Reporte de mantenimientos correctivos y preventivos realizados en el mes', type: 'select', name: 'REPORTE_MANTENIMIENTOS', options: ['SI', 'NO'], required: false },
        { label: 'Fecha de mantenimiento', type: 'date', name: 'FECHA', required: false },
        { label: 'Adjuntar soportes (facturas)', type: 'text', name: 'ADJUNTAR_SOPORTES', placeholder: 'URL o referencia', required: false },
        { label: 'Descripción del mantenimiento', type: 'textarea', name: 'DESCRIPCION', required: false },
        { label: '¿Se encuentra de pico y placa?', type: 'select', name: 'PICO_Y_PLACA', options: ['SI', 'NO'], required: false },
        { label: 'Día del mes', type: 'number', name: 'DIA_DEL_MES', required: false },
        { label: 'Día de la semana', type: 'text', name: 'DIA_SEMANA', required: false },
        { label: 'Mes', type: 'text', name: 'MES', required: false },
        { label: '¿Algún componente en mal estado o por cambiar?', type: 'select', name: 'COMPONENTE_MAL_ESTADO', options: ['NO', 'SI'], required: false },
        { label: '¿Realizó arreglos?', type: 'select', name: 'REALIZO_ARREGLOS', options: ['NO', 'SI'], required: false },
        { label: 'Anexe recibo en caso de tener (archivo o enlace)', type: 'text', name: 'RECIBO_REFERENCIA', required: false, placeholder: 'URL o referencia del recibo' },
        { label: '¿Adjunta algún reporte? (archivo o enlace)', type: 'text', name: 'REPORTE_ADJUNTO', required: false, placeholder: 'URL o referencia del reporte' }
      ];
    }

    res.json({ fields });
  } catch (err) {
    console.error(' Error en getForm:', err);
    res.status(500).json({
      error: 'Error obteniendo formulario',
      message: err.message
    });
  }
};

/**
 * POST /api/preop/submit/:type
 * Enviar preoperacional
 */
exports.submitPreop = async (req, res) => {
  try {
    let user = req.session?.user;
    const isPublic = !user;
    const { type } = req.params;
    const fileId = resolveFileId(type);
    const payload = req.body || {};

    let tokens = req.session?.tokens;
    if (!tokens) {
      tokens = getAdminTokens();
      if (!tokens) {
        console.error(' No hay tokens disponibles (ni de usuario ni de admin)');
        return res.status(500).json({
          error: 'Error de autenticación',
          message: 'No se pueden guardar los datos. El administrador debe iniciar sesión primero.'
        });
      }
      console.log('🔑 Usando tokens del admin para usuario público');
    }

    const colombiaTime = getColombiaTime();
    const today = colombiaTime.toISOString().split('T')[0];
    const currentHour = colombiaTime.getHours();
    const currentMinutes = colombiaTime.getMinutes();
    const timeInMinutes = currentHour * 60 + currentMinutes;

    payload.FECHA_REGISTRO = colombiaTime.toISOString();
    payload.USUARIO_GOOGLE = isPublic ? 'APP-PUBLIC' : user.email;

    const userIdToCheck = payload.ID_CONDUCTOR || user?.email || 'unknown';
    let userName;
    if (type === 'moto') {
      userName = payload.NOMBRE_CONDUCTOR || user?.name || 'Unknown';
    } else {
      userName = payload.CONDUCTOR || user?.name || 'Unknown';
    }

    console.log(` Procesando preoperacional: ${userName} (${userIdToCheck}) - Tipo: ${type} - Público: ${isPublic}`);

    if (!isPublic) {
      const isWorking = await isWorkingDay(userIdToCheck, today);
      if (!isWorking) {
        console.log(` ${userName} - Día no laboral`);
        return res.status(403).json({
          error: 'Día no laboral',
          message: 'Hoy no es necesario llenar el preoperacional.',
          reason: 'dia_no_laboral'
        });
      }
    }

    const deadline9AM = 9 * 60;
    const deadline12PM = 12 * 60;
    let status = 'completado';
    let wasLate = false;

    if (timeInMinutes > deadline9AM && timeInMinutes <= deadline12PM) {
      status = 'entregado_tarde';
      wasLate = true;
      console.log(` ${userName} - Entrega TARDÍA (${currentHour}:${currentMinutes})`);
    } else if (timeInMinutes > deadline12PM) {
      console.log(` ${userName} - FUERA DE HORARIO (${currentHour}:${currentMinutes})`);

      if (!isPublic) {
        await handleMissedDeadline(userIdToCheck, userName, today, tokens);
      }

      return res.status(403).json({
        error: 'Fuera de horario',
        message: 'El plazo para entregar el preoperacional ha terminado (12:00 PM).',
        reason: 'fuera_de_horario',
        timeWindow: 'expired'
      });
    }

    console.log(' Guardando en Google Sheets...');
    try {
      await appendPreopResponse(tokens, fileId, payload, type);
      console.log(' Guardado en formulario');
    } catch (sheetError) {
      console.error(' Error guardando en sheets:', sheetError.message);
      throw new Error(`Error guardando en Google Sheets: ${sheetError.message}`);
    }

    if (!isPublic) {
      console.log(' Guardando en MongoDB...');
      let record = await PreoperationalRecord.findOne({
        userId: userIdToCheck,
        date: today
      });

      if (record) {
        record.status = status;
        record.deliveryTime = colombiaTime;
        record.formData = payload;
        record.wasLate = wasLate;
        console.log(' Actualizando registro existente');
      } else {
        record = new PreoperationalRecord({
          userId: userIdToCheck,
          userName,
          date: today,
          status,
          deliveryTime: colombiaTime,
          formData: payload,
          wasLate
        });
        console.log(' Creando nuevo registro');
      }

      await record.save();
      console.log(' Registro guardado en MongoDB');
      try {
        const recordDate = new Date(today);
        await syncUserMonthReview(
          tokens,
          userIdToCheck,
          userName,
          recordDate.getFullYear(),
          recordDate.getMonth() + 1
        );
        console.log(' Informe de revisión sincronizado');
      } catch (syncError) {
        console.error(' Error sincronizando informe:', syncError.message);
      }

      if (wasLate) {
        try {
          await emailNotificationService.notifyLateDelivery(
            tokens,
            userName,
            userIdToCheck,
            today,
            colombiaTime
          );
          console.log(' Notificación de retraso enviada');
        } catch (emailError) {
          console.error(' Error enviando notificación:', emailError.message);
        }
      }
    }

    console.log(` Preoperacional guardado exitosamente: ${userName} - ${status}`);
    res.json({
      success: true,
      message: wasLate
        ? ' Preoperacional registrado con RETRASO'
        : ' Preoperacional registrado correctamente',
      status,
      wasLate,
      timestamp: colombiaTime.toISOString()
    });
  } catch (err) {
    console.error(' Error en submitPreop:', err);
    res.status(500).json({
      error: 'Error registrando preoperacional',
      message: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

// ==================== NUEVAS RUTAS - PANEL ADMIN ====================

/**
 * GET /api/preop/users-list
 */
exports.getUsersList = async (req, res) => {
  try {
    const users = await getUsersFromSheet();
    res.json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    console.error(' Error obteniendo usuarios:', error);
    res.status(500).json({
      error: 'Error al obtener usuarios',
      message: error.message
    });
  }
};

/**
 * GET /api/preop/check-availability
 */
exports.checkCanFillToday = async (req, res) => {
  try {
    const { userId, userName } = req.query;
    console.log(' Verificando disponibilidad:', { userId, userName });

    if (!userId) {
      return res.status(400).json({
        error: 'userId es requerido'
      });
    }

    const colombiaTime = getColombiaTime();
    const today = colombiaTime.toISOString().split('T')[0];
    const currentHour = colombiaTime.getHours();
    const currentMinutes = colombiaTime.getMinutes();
    const timeInMinutes = currentHour * 60 + currentMinutes;

    console.log('  Fecha de hoy:', today);
    console.log('  Hora actual:', currentHour + ':' + currentMinutes);
    console.log('  Minutos transcurridos:', timeInMinutes);

    console.log('  Verificando si es día laboral...');
    const isWorking = await isWorkingDay(userId, today);
    console.log('  Es día laboral?', isWorking);

    if (!isWorking) {
      console.log(' No es día laboral, bloqueando');
      return res.json({
        canFill: false,
        reason: 'dia_no_laboral',
        message: 'Hoy es día no laboral. No es necesario llenar el preoperacional.'
      });
    }

    console.log('  Buscando registro existente...');
    const existingRecord = await PreoperationalRecord.findOne({
      userId,
      date: today
    });

    console.log('  Registro encontrado:', existingRecord);
    if (existingRecord && existingRecord.status !== 'no_entregado') {
      console.log(' Ya completó el preoperacional');
      return res.json({
        canFill: false,
        reason: 'ya_completado',
        message: 'Ya has completado el preoperacional de hoy.',
        record: existingRecord
      });
    }

    const deadline9AM = 9 * 60;
    const deadline12PM = 12 * 60;
    console.log('  Evaluando horario...');

    if (timeInMinutes <= deadline9AM) {
      console.log(' PUEDE LLENAR - Horario normal');
      return res.json({
        canFill: true,
        timeWindow: 'normal',
        message: 'Puedes llenar tu preoperacional normalmente.',
        deadline: '9:00 AM'
      });
    } else if (timeInMinutes > deadline9AM && timeInMinutes <= deadline12PM) {
      console.log(' PUEDE LLENAR - Pero tarde');
      return res.json({
        canFill: true,
        timeWindow: 'late',
        message: ' Estás fuera del horario normal. Se registrará como entrega tardía.',
        deadline: '12:00 PM',
        warning: true
      });
    } else {
      console.log(' NO PUEDE LLENAR - Fuera de horario');
      return res.json({
        canFill: false,
        reason: 'fuera_de_horario',
        message: 'El plazo para llenar el preoperacional de hoy ha terminado (12:00 PM).',
        timeWindow: 'expired'
      });
    }
  } catch (error) {
    console.error(' Error verificando disponibilidad:', error);
    res.status(500).json({
      error: 'Error al verificar disponibilidad',
      message: error.message
    });
  }
};

/**
 * POST /api/preop/sync-review
 */
exports.syncReview = async (req, res) => {
  try {
    // 1) tokens de sesión
    let tokens = req.session?.tokens;

    // 2) respaldo con tokens de admin
    if (!tokens) {
      tokens = getAdminTokens();
    }

    if (!tokens) {
      return res.status(401).json({
        error: 'No hay tokens disponibles para sincronizar el informe'
      });
    }

    const { userId, userName, year, month } = req.body;
    if (!year || !month) {
      return res.status(400).json({
        error: 'Se requieren year y month'
      });
    }

    let result;
    if (userId) {
      result = await syncUserMonthReview(tokens, userId, userName, year, month);
    } else {
      result = await syncAllUsersForMonth(tokens, year, month);
    }

    res.json({
      success: true,
      message: 'Sincronización completada',
      data: result
    });
  } catch (error) {
    console.error(' Error en sincronización:', error);
    res.status(500).json({
      error: 'Error sincronizando informe',
      message: error.message
    });
  }
};

/**
 * Obtener estado diario de todos los usuarios
 * GET /api/preop/daily-status?date=2025-12-18
 */
exports.getDailyStatus = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Fecha requerida (formato: YYYY-MM-DD)'
      });
    }

    console.log(` Obteniendo estado diario para: ${date}`);

    const users = await preoperationalService.getUsersFromSheet();
    const records = await PreoperationalRecord.find({ date }).lean();

    const recordsMap = {};
    records.forEach(record => {
      recordsMap[record.userId] = record;
    });

    const usersStatus = users
      .filter(user => user.ACTIVO)
      .map(user => {
        const record = recordsMap[user.ID];

        return {
          userId: user.ID,
          userName: user.NOMBRE,
          vehicleType: user.TIPO,
          hasRecord: !!record,
          status: record?.status || 'pendiente',
          deliveryTime: record?.deliveryTime || null,
          wasLate: record?.wasLate || false,
          formData: record?.formData || null
        };
      });

    const stats = {
      total: usersStatus.length,
      completed: usersStatus.filter(u => u.status === 'completado').length,
      late: usersStatus.filter(u => u.status === 'entregado_tarde').length,
      missing: usersStatus.filter(u => u.status === 'no_entregado' || u.status === 'pendiente').length
    };

    console.log(` Estado diario obtenido: ${stats.completed} completados, ${stats.late} tardíos, ${stats.missing} faltantes`);

    res.json({
      success: true,
      date,
      stats,
      users: usersStatus
    });
  } catch (error) {
    console.error('❌ Error obteniendo estado diario:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * GET /api/preop/user-history
 */
exports.getUserHistory = async (req, res) => {
  try {
    const { userId, startDate, endDate } = req.query;

    if (!userId || !startDate || !endDate) {
      return res.status(400).json({
        error: 'Faltan parámetros',
        message: 'Se requieren userId, startDate y endDate'
      });
    }

    console.log(` Obteniendo historial: ${userId} desde ${startDate} hasta ${endDate}`);

    const records = await PreoperationalRecord.find({
      userId,
      date: {
        $gte: startDate,
        $lte: endDate
      }
    })
      .sort({ date: -1 })
      .lean();

    console.log(` Encontrados ${records.length} registros históricos`);

    res.json({
      success: true,
      userId,
      startDate,
      endDate,
      records
    });
  } catch (error) {
    console.error(' Error obteniendo historial:', error);
    res.status(500).json({
      error: 'Error obteniendo historial',
      message: error.message
    });
  }
};

/**
 * GET /api/preop/user-calendar
 */
exports.getUserCalendar = async (req, res) => {
  try {
    const { userId, startDate, endDate } = req.query;

    if (!userId || !startDate || !endDate) {
      return res.status(400).json({
        error: 'Faltan parámetros',
        message: 'Se requieren userId, startDate y endDate'
      });
    }

    console.log(` Obteniendo calendario: ${userId} desde ${startDate} hasta ${endDate}`);

    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T23:59:59');
    const workingDays = [];
    const current = new Date(start);

    while (current <= end) {
      const dateString = current.toISOString().split('T')[0];
      const isWorking = await isWorkingDay(userId, dateString);

      if (isWorking) {
        workingDays.push(dateString);
      }

      current.setDate(current.getDate() + 1);
    }

    console.log(` Días laborales encontrados: ${workingDays.length}`);

    res.json({
      success: true,
      userId,
      startDate,
      endDate,
      workingDays,
      totalDays: Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1,
      workingDaysCount: workingDays.length
    });
  } catch (error) {
    console.error(' Error obteniendo calendario:', error);
    res.status(500).json({
      error: 'Error obteniendo calendario',
      message: error.message
    });
  }
};

/**
 * GET /api/preop/sanctions
 */
exports.getUserSanctions = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        error: 'userId es requerido'
      });
    }

    let sanctions = await UserSanction.findOne({ userId });

    if (!sanctions) {
      sanctions = {
        userId,
        totalSanctions: 0,
        sanctionHistory: [],
        hasCitation: false
      };
    }

    res.json({
      success: true,
      sanctions
    });
  } catch (error) {
    console.error(' Error obteniendo sanciones:', error);
    res.status(500).json({
      error: 'Error al obtener sanciones',
      message: error.message
    });
  }
};

// ==================== FUNCIONES HELPER ====================

async function handleMissedDeadline(userId, userName, date, tokens) {
  try {
    let record = await PreoperationalRecord.findOne({ userId, date });

    if (!record) {
      record = new PreoperationalRecord({
        userId,
        userName,
        date,
        status: 'no_entregado',
        deliveryTime: null,
        formData: null,
        wasLate: false
      });
      await record.save();
    }

    let sanctions = await UserSanction.findOne({ userId });

    if (!sanctions) {
      sanctions = new UserSanction({
        userId,
        userName,
        totalSanctions: 0,
        sanctionHistory: []
      });
    }

    sanctions.totalSanctions += 1;
    sanctions.sanctionHistory.push({
      date,
      reason: 'no_entregado',
      sanctionNumber: sanctions.totalSanctions,
      createdAt: new Date()
    });
    sanctions.lastSanctionDate = new Date();

    if (sanctions.totalSanctions >= 3 && !sanctions.hasCitation) {
      sanctions.hasCitation = true;
      sanctions.citationDate = new Date();

      if (tokens) {
        console.log(` Enviando email de citación a ${userName}...`);
        const emailResults = await emailNotificationService.sendCitationEmail(
          tokens,
          userName,
          userId,
          sanctions.sanctionHistory
        );

        sanctions.citationEmails.push({
          sentDate: new Date(),
          sanctionCount: sanctions.totalSanctions,
          emailSent: emailResults.some(r => r.success),
          recipients: emailResults.map(r => r.to)
        });

        console.log(` Email de citación enviado a ${userName}`);
      }
    }

    await sanctions.save();

    if (tokens) {
      await emailNotificationService.notifyMissedPreoperational(
        tokens,
        userName,
        userId,
        date
      );
    }

    console.log(` Sanción aplicada: ${userName} - Total: ${sanctions.totalSanctions}`);
  } catch (error) {
    console.error('❌ Error aplicando sanción:', error);
  }
};

/**
 * Verificar preoperacionales no entregados y aplicar sanciones
 * Se ejecuta manualmente o por cron job a las 12 PM
 */
exports.checkMissedPreoperationals = async (req, res) => {
  try {
    console.log('🔍 Verificando preoperacionales no entregados...');

    const tokens = getAdminTokens();

    if (!tokens) {
      console.warn(' No hay tokens de admin disponibles');
      return res.status(401).json({
        success: false,
        message: 'No hay tokens de admin disponibles para enviar emails'
      });
    }

    const colombiaDate = new Date().toLocaleString('es-CO', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    console.log(`📅 Colombia DateTime: ${colombiaDate}`);

    const dateObj = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }));
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const date = `${year}-${month}-${day}`;

    console.log(`📅 Fecha procesada: ${date}`);

    const users = await preoperationalService.getUsersFromSheet();
    console.log(`👥 Total usuarios activos: ${users.filter(u => u.ACTIVO).length}`);

    const results = [];
    let sanctionedCount = 0;
    let citationsTriggered = 0;

    for (const user of users) {
      if (!user.ACTIVO) continue;

      const record = await PreoperationalRecord.findOne({
        userId: user.ID,
        date
      });

      if (!record || record.status === 'no_entregado') {
        console.log(` Usuario sin preoperacional: ${user.NOMBRE} (${user.ID})`);

        const sanctionResult = await handleMissedDeadline(
          user.ID,
          user.NOMBRE,
          date,
          tokens
        );

        sanctionedCount++;

        if (sanctionResult.hasCitation && sanctionResult.totalSanctions === 3) {
          citationsTriggered++;
        }

        results.push({
          userId: user.ID,
          userName: user.NOMBRE,
          sanctioned: true,
          totalSanctions: sanctionResult.totalSanctions,
          hasCitation: sanctionResult.hasCitation
        });
      }
    }

    console.log(` Verificación completada.`);
    console.log(`    Usuarios sancionados: ${sanctionedCount}`);
    console.log(`    Citaciones activadas: ${citationsTriggered}`);

    res.json({
      success: true,
      date,
      timestamp: colombiaDate,
      totalUsers: users.filter(u => u.ACTIVO).length,
      sanctioned: sanctionedCount,
      citationsTriggered,
      details: results
    });
  } catch (error) {
    console.error('❌ Error en check-missed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

module.exports = exports;
