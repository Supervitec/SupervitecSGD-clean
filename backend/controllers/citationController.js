const Citation = require('../models/Citation');
const UserSanction = require('../models/UserSanction');
const { createCitationEvent, deleteCitationEvent } = require('../services/googleCalendarServices');
const { appendRow } = require('../services/googleSheetsService');
const emailNotificationService = require('../services/emailNotificationService');

// Helper para normalizar texto (quitar acentos, lowercase)
function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Crear nueva citación
 * POST /api/citations
 */
exports.createCitation = async (req, res) => {
  try {
    const { userId, userName, citationDate, reason, reasonDetails } = req.body;
    const tokens = req.session?.tokens;
    const adminEmail = req.session?.user?.email;

    if (!tokens || !adminEmail) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const existingCitation = await Citation.findOne({
      userId,
      status: 'programada',
      citationDate: { $gte: new Date() }
    });

    if (existingCitation) {
      return res.status(400).json({
        error: 'Ya existe una citación programada para este usuario'
      });
    }

    let googleEventId = null;
    try {
      googleEventId = await createCitationEvent(tokens, {
        userId,
        userName,
        citationDate: new Date(citationDate),
        reason,
        reasonDetails
      });
      console.log(' Evento creado en Google Calendar:', googleEventId);
    } catch (calendarError) {
      console.error('❌ Error creando evento en calendario:', calendarError);
    }

    const citation = new Citation({
      userId,
      userName,
      citationDate: new Date(citationDate),
      reason,
      reasonDetails,
      googleCalendarEventId: googleEventId,
      createdBy: adminEmail
    });

    await citation.save();
    console.log(' Citación guardada en MongoDB:', citation._id);

    let sanction = await UserSanction.findOne({ userId });
    if (!sanction) {
      sanction = new UserSanction({
        userId,
        userName
      });
    }
    sanction.hasCitation = true;
    sanction.citationDate = new Date(citationDate);
    await sanction.save();
    console.log(' UserSanction actualizado');

    // 🔥 ENVIAR EMAIL DE CITACIÓN
    try {
      console.log(`\n📧 ========== ENVIANDO EMAIL DE CITACIÓN ==========`);
      console.log(`👤 Usuario: ${userName}`);
      console.log(`🆔 UserId: ${userId}`);
      
      const { getUserEmail } = require('../services/preoperationalService');
      const userEmail = await getUserEmail(userId);
      
      console.log(`📬 Email obtenido: ${userEmail || 'NO ENCONTRADO'}`);
      
      if (!userEmail) {
        console.warn(`⚠️ ADVERTENCIA: No se encontró email para userId "${userId}"`);
        console.warn(`⚠️ El email solo se enviará al admin`);
      }
      
      const sanctionHistoryForEmail = sanction.sanctionHistory.map(s => ({
        sanctionNumber: s.sanctionNumber,
        date: new Date(s.date).toLocaleDateString('es-CO'),
        reason: s.reason
      }));

      console.log(`📋 Historial de sanciones: ${sanctionHistoryForEmail.length} registros`);

      const emailResults = await emailNotificationService.sendCitationEmail(
        tokens,
        userName,
        userId,
        sanctionHistoryForEmail.length > 0 ? sanctionHistoryForEmail : [
          { 
            sanctionNumber: 1, 
            date: new Date(citationDate).toLocaleDateString('es-CO'), 
            reason 
          }
        ],
        userEmail
      );
      
      console.log(` Resultados de envío de email:`);
      emailResults.forEach((result, idx) => {
        console.log(`   ${idx + 1}. Para: ${result.to} - ${result.success !== false ? ' Enviado' : '❌ Falló'}`);
        if (result.error) {
          console.log(`      Error: ${result.error}`);
        }
      });
      console.log(`========================================\n`);
      
    } catch (emailError) {
      console.error('❌ ERROR ENVIANDO EMAIL DE CITACIÓN:');
      console.error('   Mensaje:', emailError.message);
      console.error('   Stack:', emailError.stack);
    }

    console.log('🔍 Verificando CITATIONS_SHEET_ID:', process.env.CITATIONS_SHEET_ID);
    console.log('🔍 Tokens disponibles:', !!tokens);

    if (process.env.CITATIONS_SHEET_ID) {
      try {
        console.log('📝 Preparando datos para Sheets...');

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

        console.log('📊 Datos a guardar:', row);
        console.log('📤 Llamando appendRow...');

        await appendRow(
          tokens,
          process.env.CITATIONS_SHEET_ID,
          'Citaciones!A:J',
          row
        );

        console.log(' Citación sincronizada con Google Sheets');
      } catch (sheetError) {
        console.error('❌ Error COMPLETO sincronizando con Sheets:');
        console.error('   Mensaje:', sheetError.message);
        console.error('   Stack:', sheetError.stack);
      }
    } else {
      console.error('❌ CITATIONS_SHEET_ID NO ESTÁ DEFINIDO en .env');
    }

    res.json({
      success: true,
      message: 'Citación creada exitosamente y notificación enviada',
      citation
    });

  } catch (error) {
    console.error('❌ Error creando citación:', error);
    res.status(500).json({
      error: 'Error al crear citación',
      message: error.message
    });
  }
};


/**
 * Marcar asistencia a citación
 * PATCH /api/citations/:id/attendance
 */
exports.markAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const adminEmail = req.session?.user?.email;
    const tokens = req.session?.tokens;

    if (!adminEmail || !tokens) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const citation = await Citation.findById(id);

    if (!citation) {
      return res.status(404).json({ error: 'Citación no encontrada' });
    }

    citation.status = status;
    citation.attendanceMarkedBy = adminEmail;
    citation.attendanceMarkedAt = new Date();
    citation.attendanceNotes = notes || '';

    await citation.save();
    console.log(' Citación actualizada en MongoDB');

    let sanction = await UserSanction.findOne({ userId: citation.userId });

    if (!sanction) {
      sanction = new UserSanction({
        userId: citation.userId,
        userName: citation.userName
      });
    }

    if (status === 'no se presento') {
      sanction.missedCitations = (sanction.missedCitations || 0) + 1;
      sanction.missedCitationHistory.push({
        citationId: citation._id,
        date: citation.citationDate,
        reason: citation.reason
      });

      if (sanction.missedCitations >= 3) {
        sanction.isBlocked = true;
        sanction.blockReason = 'ausencias_citacion';
        sanction.blockedAt = new Date();
        sanction.blockedBy = adminEmail;
      }

      sanction.hasCitation = false;
    } else if (status === 'se presento') {
      sanction.hasCitation = false;
    }

    await sanction.save();
    console.log(' UserSanction actualizado');

    console.log('📝 Sincronizando asistencia con Sheets...');

    if (process.env.CITATIONS_SHEET_ID) {
      try {
        const row = [
          citation._id.toString(),
          citation.userId,
          citation.userName,
          new Date(citation.citationDate).toLocaleString('es-CO', { timeZone: 'America/Bogota' }),
          citation.reason,
          citation.status,
          citation.attendanceMarkedBy,
          new Date(citation.attendanceMarkedAt).toLocaleString('es-CO', { timeZone: 'America/Bogota' }),
          citation.attendanceNotes || '',
          sanction.missedCitations,
          sanction.isBlocked ? 'SÍ' : 'NO'
        ];

        console.log('📊 Datos de asistencia a guardar:', row);

        await appendRow(
          tokens,
          process.env.CITATIONS_SHEET_ID,
          'Asistencias!A:K',
          row
        );

        console.log(' Asistencia sincronizada con Google Sheets');
      } catch (sheetError) {
        console.error('❌ Error sincronizando asistencia con Sheets:');
        console.error('   Mensaje:', sheetError.message);
        console.error('   Stack:', sheetError.stack);
      }
    } else {
      console.error('❌ CITATIONS_SHEET_ID NO ESTÁ DEFINIDO');
    }

    res.json({
      success: true,
      message: `Asistencia marcada: ${status}`,
      citation,
      isUserBlocked: sanction.isBlocked,
      missedCitations: sanction.missedCitations
    });

  } catch (error) {
    console.error('❌ Error marcando asistencia:', error);
    res.status(500).json({
      error: 'Error al marcar asistencia',
      message: error.message
    });
  }
};

/**
 * Desbloquear usuario manualmente
 * POST /api/citations/unblock/:userId
 */
exports.unblockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    const adminEmail = req.session?.user?.email;
    const tokens = req.session?.tokens;

    if (!adminEmail || !tokens) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const sanction = await UserSanction.findOne({ userId });

    if (!sanction) {
      return res.status(404).json({ error: 'Usuario no encontrado en el sistema de sanciones' });
    }

    if (!sanction.isBlocked) {
      return res.status(400).json({ 
        error: 'Usuario no está bloqueado',
        missedCitations: sanction.missedCitations 
      });
    }

    const unblockReason = reason || 'Desbloqueo manual por admin';

    sanction.isBlocked = false;
    sanction.blockReason = null;
    sanction.unblockHistory.push({
      unblockedBy: adminEmail,
      unblockedAt: new Date(),
      reason: unblockReason,
      notes: `Desbloqueado con ${sanction.missedCitations} ausencias acumuladas`
    });

    await sanction.save();
    console.log(' Usuario desbloqueado en MongoDB');

    if (process.env.CITATIONS_SHEET_ID) {
      try {
        const row = [
          new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' }),
          sanction.userId,
          sanction.userName,
          'Desbloqueado',
          unblockReason,
          adminEmail,
          sanction.missedCitations,
          sanction.totalSanctions || 0
        ];

        await appendRow(
          tokens,
          process.env.CITATIONS_SHEET_ID,
          'Desbloqueos!A:H',
          row
        );

        console.log(' Desbloqueo sincronizado con Google Sheets');
      } catch (sheetError) {
        console.error('❌ Error sincronizando desbloqueo con Sheets:', sheetError.message);
      }
    }

    res.json({
      success: true,
      message: 'Usuario desbloqueado exitosamente',
      sanction
    });

  } catch (error) {
    console.error('❌ Error desbloqueando usuario:', error);
    res.status(500).json({
      error: 'Error al desbloquear usuario',
      message: error.message
    });
  }
};

/**
 * Listar citaciones CON BÚSQUEDA Y ESTADO DE BLOQUEO
 * GET /api/citations?status=programada&userId=xxx&search=nombre
 */
exports.listCitations = async (req, res) => {
  try {
    const { status, userId, search } = req.query;

    const query = {};
    if (status) query.status = status;
    if (userId) query.userId = userId;

    // 🔍 BÚSQUEDA POR NOMBRE (normalizada)
    if (search) {
      const normalized = normalizeText(search);
      query.$or = [
        { userName: { $regex: normalized, $options: 'i' } },
        { userId: { $regex: normalized, $options: 'i' } }
      ];
    }

    const citations = await Citation.find(query)
      .sort({ citationDate: -1 })
      .limit(100);

    // 🔥 AGREGAR ESTADO DE BLOQUEO DE CADA USUARIO
    const citationsWithBlockStatus = await Promise.all(
      citations.map(async (citation) => {
        const sanction = await UserSanction.findOne({ userId: citation.userId });
        
        return {
          ...citation.toObject(),
          userIsBlocked: sanction?.isBlocked || false,
          missedCitations: sanction?.missedCitations || 0
        };
      })
    );

    res.json({
      success: true,
      count: citationsWithBlockStatus.length,
      citations: citationsWithBlockStatus
    });

  } catch (error) {
    console.error('❌ Error listando citaciones:', error);
    res.status(500).json({
      error: 'Error al listar citaciones',
      message: error.message
    });
  }
};

module.exports = {
  createCitation: exports.createCitation,
  markAttendance: exports.markAttendance,
  unblockUser: exports.unblockUser,
  listCitations: exports.listCitations
};
