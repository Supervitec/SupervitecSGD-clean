const { 
  getMeses,
  getReportData, 
  updateObservacion,
  updateMantenimientos,
  updateRecibos,
} = require('../services/reviewReportService');
const { getAdminTokens } = require('../services/tokenManager');

/**
 * GET /api/review/months
 */
exports.getMonths = async (req, res) => {
  try {
    let tokens = req.session?.tokens || getAdminTokens();
    if (!tokens) {
      return res.status(401).json({ error: 'No hay tokens disponibles' });
    }

    console.log('Obteniendo meses disponibles...');
    const meses = await getMeses(tokens);

    res.json({
      success: true,
      meses,
    });
  } catch (error) {
    console.error('Error getMonths:', error);
    res.status(500).json({
      error: 'Error obteniendo meses',
      message: error.message,
    });
  }
};

/**
 * GET /api/review?month=ENERO_2025
 */
exports.getReview = async (req, res) => {
  try {
    let tokens = req.session?.tokens || getAdminTokens();
    if (!tokens) {
      return res.status(401).json({ error: 'No hay tokens disponibles' });
    }

    const { month } = req.query;
    console.log(`Obteniendo revisión del mes: ${month || 'actual'}`);

    const data = await getReportData(tokens, { month });

    res.json({
      success: true,
      ...data,
    });
  } catch (error) {
    console.error('Error getReview:', error);
    res.status(500).json({
      error: 'Error obteniendo revisión',
      message: error.message,
    });
  }
};

/**
 * PUT /api/review/observacion
 */
exports.updateObservacionEndpoint = async (req, res) => {
  try {
    const tokens = req.session?.tokens;
    if (!tokens) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const { mes, fila, valor } = req.body;

    if (!mes || !fila) {
      return res.status(400).json({
        error: 'Faltan parámetros',
        message: 'Se requieren mes y fila',
      });
    }

    console.log(`Actualizando observación: ${mes} fila ${fila}`);
    await updateObservacion(tokens, { mes, fila, valor });

    res.json({
      success: true,
      message: 'Observación actualizada correctamente',
    });
  } catch (error) {
    console.error('Error updateObservacion:', error);
    res.status(500).json({
      error: 'Error actualizando observación',
      message: error.message,
    });
  }
};

/**
 * PUT /api/review/mantenimientos
 */
exports.updateMantenimientosEndpoint = async (req, res) => {
  try {
    const tokens = req.session?.tokens;
    if (!tokens) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const { mes, fila, valor } = req.body;

    if (!mes || !fila) {
      return res.status(400).json({
        error: 'Faltan parámetros',
        message: 'Se requieren mes y fila',
      });
    }

    console.log(`Actualizando mantenimientos: ${mes} fila ${fila}`);
    await updateMantenimientos(tokens, { mes, fila, valor });

    res.json({
      success: true,
      message: 'Mantenimientos actualizados correctamente',
    });
  } catch (error) {
    console.error('Error updateMantenimientos:', error);
    res.status(500).json({
      error: 'Error actualizando mantenimientos',
      message: error.message,
    });
  }
};

/**
 * PUT /api/review/recibos
 */
exports.updateRecibosEndpoint = async (req, res) => {
  try {
    const tokens = req.session?.tokens;
    if (!tokens) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const { mes, fila, valor } = req.body;

    if (!mes || !fila) {
      return res.status(400).json({
        error: 'Faltan parámetros',
        message: 'Se requieren mes y fila',
      });
    }

    console.log(`Actualizando recibos: ${mes} fila ${fila}`);
    await updateRecibos(tokens, { mes, fila, valor });

    res.json({
      success: true,
      message: 'Recibos actualizados correctamente',
    });
  } catch (error) {
    console.error('Error updateRecibos:', error);
    res.status(500).json({
      error: 'Error actualizando recibos',
      message: error.message,
    });
  }
}; // ✅ CIERRA updateRecibosEndpoint

/**
 * POST /api/review/citar-automatico
 * Crear citación automática para conductor con 3+ tardanzas
 */
exports.citarAutomatico = async (req, res) => {
  try {
    const tokens = req.session?.tokens || getAdminTokens();
    const adminEmail = req.session?.user?.email || process.env.ADMIN_EMAIL;
    
    if (!tokens) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const { conductor } = req.body;

    if (!conductor || !conductor.userId) {
      return res.status(400).json({
        error: 'Faltan datos del conductor',
        message: 'Se requiere información del conductor'
      });
    }

    console.log(`📋 Citando automáticamente a: ${conductor.nombre} (ID: ${conductor.userId})`);

    // Importar modelos y servicios necesarios
    const Citation = require('../models/Citation');
    const UserSanction = require('../models/UserSanction');
    const { createCitationEvent } = require('../services/googleCalendarServices');
    const { appendRow } = require('../services/googleSheetsService');
    const emailNotificationService = require('../services/emailNotificationService');
    const { getUserEmail } = require('../services/preoperationalService');

    // Verificar si ya tiene citación programada
    const existingCitation = await Citation.findOne({
      userId: conductor.userId,
      status: 'programada',
      citationDate: { $gte: new Date() }
    });

    if (existingCitation) {
      return res.status(400).json({
        success: false,
        error: 'Ya existe una citación programada para este usuario'
      });
    }

    // Fecha de citación: 3 días hábiles desde hoy
    const citationDate = new Date();
    citationDate.setDate(citationDate.getDate() + 3);
    citationDate.setHours(9, 0, 0, 0);

    const reason = 'sanciones acumuladas';
    const reasonDetails = `Citación automática por acumular ${conductor.totalTardanzas} tardanzas`;

    // Crear evento en Google Calendar
    let googleEventId = null;
    try {
      googleEventId = await createCitationEvent(tokens, {
        userId: conductor.userId,
        userName: conductor.nombre,
        citationDate,
        reason,
        reasonDetails
      });
      console.log('✅ Evento creado en Calendar:', googleEventId);
    } catch (calendarError) {
      console.error('❌ Error creando evento:', calendarError.message);
    }

    // Crear citación en MongoDB
    const citation = new Citation({
      userId: conductor.userId,
      userName: conductor.nombre,
      citationDate,
      reason,
      reasonDetails,
      googleCalendarEventId: googleEventId,
      createdBy: adminEmail
    });

    await citation.save();
    console.log('✅ Citación guardada en MongoDB');

    // Actualizar UserSanction
    let sanction = await UserSanction.findOne({ userId: conductor.userId });
    if (!sanction) {
      sanction = new UserSanction({
        userId: conductor.userId,
        userName: conductor.nombre
      });
    }
    sanction.hasCitation = true;
    sanction.citationDate = citationDate;
    await sanction.save();

    // 🔥 ENVIAR EMAIL DE CITACIÓN
    try {
      const userEmail = await getUserEmail(conductor.userId);
      
      const sanctionHistoryForEmail = sanction.sanctionHistory.map(s => ({
        sanctionNumber: s.sanctionNumber,
        date: new Date(s.date).toLocaleDateString('es-CO'),
        reason: s.reason
      }));

      await emailNotificationService.sendCitationEmail(
        tokens,
        conductor.nombre,
        conductor.userId,
        sanctionHistoryForEmail.length > 0 ? sanctionHistoryForEmail : [
          { 
            sanctionNumber: 1, 
            date: new Date().toLocaleDateString('es-CO'), 
            reason 
          }
        ],
        userEmail
      );
      
      console.log(`✅ Email enviado a ${conductor.nombre}`);
    } catch (emailError) {
      console.error('⚠️ Error enviando email:', emailError.message);
    }

    // Guardar en Google Sheets (Citaciones)
    if (process.env.CITATIONS_SHEET_ID) {
      try {
        const row = [
          citation._id.toString(),
          citation.userId,
          citation.userName,
          new Date(citation.citationDate).toLocaleString('es-CO', { timeZone: 'America/Bogota' }),
          citation.reason,
          citation.reasonDetails || '',
          citation.status,
          citation.createdBy,
          new Date(citation.createdAt).toLocaleString('es-CO', { timeZone: 'America/Bogota' }),
          googleEventId || 'N/A'
        ];

        await appendRow(tokens, process.env.CITATIONS_SHEET_ID, 'Citaciones!A:J', row);
        console.log('✅ Citación sincronizada con Sheets');
      } catch (sheetError) {
        console.error('❌ Error guardando en Sheets:', sheetError.message);
      }
    }

    res.json({
      success: true,
      message: `Citación creada para ${conductor.nombre}`,
      citation: {
        id: citation._id,
        userName: citation.userName,
        citationDate: citation.citationDate,
        reason: citation.reason
      }
    });

  } catch (error) {
    console.error('❌ Error en citarAutomatico:', error);
    res.status(500).json({
      success: false,
      error: 'Error creando citación',
      message: error.message
    });
  }
}; 

module.exports = {
  getMonths: exports.getMonths,
  getReview: exports.getReview,
  updateObservacionEndpoint: exports.updateObservacionEndpoint,
  updateMantenimientosEndpoint: exports.updateMantenimientosEndpoint,
  updateRecibosEndpoint: exports.updateRecibosEndpoint,
  citarAutomatico: exports.citarAutomatico,
};
