const { setCredentials } = require('../config/google-auth');
const { Parser } = require('json2csv');
const {
  getAdminForms,
  getAdminTokensUnsafe,
  getGoogleForms,
  getFormStructure,
  getFormResponses,
  getFormResponsesWithAnalytics,
  getFormResponsesByDateRange
} = require('../services/googleService');
const { google } = require('googleapis');

/**
 * Helper: tokens de admin si existen, si no, tokens de sesión
 */
function resolveTokens(req) {
  const sessionTokens = req.session?.tokens;
  const adminTokens = getAdminTokensUnsafe();
  return adminTokens || sessionTokens;
}

/**
 * Obtiene todos los formularios de Google Forms 
 */
exports.getForms = async (req, res) => {
  try {
    const maxResults = parseInt(req.query.limit) || 50;

    console.log('📋 [UserMode] Cargando formularios del ADMIN para todos');
    
    // 🔥 INTENTAR OBTENER TOKENS DE ADMIN
    const { getAdminTokens } = require('../services/tokenManager');
    const adminTokens = getAdminTokens();
    
    if (!adminTokens) {
      console.error('❌ No hay tokens de admin disponibles');
      return res.status(401).json({ 
        error: 'No autenticado', 
        message: 'El administrador debe iniciar sesión primero' 
      });
    }

    console.log('✅ Tokens de admin obtenidos, cargando formularios...');
    
    // Usar directamente la API de Google Drive
    const { setCredentials } = require('../config/google-auth');
    const { google } = require('googleapis');
    
    const auth = setCredentials(adminTokens);
    const drive = google.drive({ version: 'v3', auth });

    const response = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.form'",
      pageSize: maxResults,
      fields: 'files(id, name, createdTime, modifiedTime, webViewLink)',
      orderBy: 'modifiedTime desc',
    });

    const forms = response.data.files || [];
    console.log(`✅ ${forms.length} formularios encontrados`);

    res.json({ success: true, count: forms.length, forms });
  } catch (error) {
    console.error('❌ Error en getForms:', error);
    res.status(500).json({ 
      error: 'Error obteniendo formularios', 
      message: error.message 
    });
  }
};


/**
 * Obtiene la estructura completa de un formulario específico
 */
exports.getFormById = async (req, res) => {
  try {
    const tokensToUse = resolveTokens(req);
    const { formId } = req.params;

    if (!tokensToUse) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    console.log(` Obteniendo estructura del formulario ${formId}...`);

    const formStructure = await getFormStructure(tokensToUse, formId);

    res.json({
      success: true,
      form: formStructure
    });
  } catch (error) {
    console.error(' Error en getFormById:', error);
    res
      .status(500)
      .json({
        error: 'Error obteniendo estructura del formulario',
        message: error.message
      });
  }
};

/**
 * Obtiene las respuestas de un formulario
 */
exports.getFormResponses = async (req, res) => {
  try {
    const tokensToUse = resolveTokens(req);
    const { formId } = req.params;

    if (!tokensToUse) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    console.log(` Obteniendo respuestas del formulario ${formId}...`);

    const responses = await getFormResponses(tokensToUse, formId);

    res.json({
      success: true,
      formId,
      count: responses.length,
      responses
    });
  } catch (error) {
    console.error(' Error en getFormResponses:', error);
    res
      .status(500)
      .json({
        error: 'Error obteniendo respuestas del formulario',
        message: error.message
      });
  }
};

/**
 * Elimina un formulario de Google Forms
 */
exports.deleteFormById = async (req, res) => {
  try {
    const tokensToUse = resolveTokens(req);
    const { formId } = req.params;

    if (!tokensToUse) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    if (!req.session.isAdmin) {
      return res
        .status(403)
        .json({ error: 'No tienes permisos para eliminar formularios' });
    }

    console.log(` Eliminando formulario ${formId}...`);

    const auth = setCredentials(tokensToUse);
    const drive = google.drive({ version: 'v3', auth });

    await drive.files.delete({ fileId: formId });

    console.log(' Formulario eliminado');
    res.json({ success: true, message: 'Formulario eliminado correctamente' });
  } catch (error) {
    console.error('Error eliminando formulario:', error);
    res
      .status(500)
      .json({ error: 'Error eliminando formulario', message: error.message });
  }
};

/**
 * Obtiene estadísticas básicas agregando respuestas por usuario
 */
exports.getFormStatistics = async (req, res) => {
  try {
    const tokensToUse = resolveTokens(req);
    const { formId } = req.params;

    if (!tokensToUse) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    console.log(` Obteniendo estadísticas del formulario ${formId}...`);

    const responses = await getFormResponses(tokensToUse, formId);

    const stats = {};
    responses.forEach((r) => {
      const email = r.respondentEmail || 'desconocido';
      stats[email] = (stats[email] || 0) + 1;
    });

    res.json({ success: true, stats });
  } catch (error) {
    console.error(' Error obteniendo estadísticas:', error);
    res
      .status(500)
      .json({
        error: 'Error obteniendo estadísticas',
        message: error.message
      });
  }
};

/**
 * Obtiene respuestas con análisis agregado
 */
exports.getFormAnalytics = async (req, res) => {
  try {
    const tokensToUse = resolveTokens(req);
    const { formId } = req.params;

    if (!tokensToUse) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    console.log(` Obteniendo analytics del formulario ${formId}...`);
    console.log('👤 Usuario solicitante:', req.session.user?.email);

    const analytics = await getFormResponsesWithAnalytics(tokensToUse, formId);

    res.json({ success: true, analytics });
  } catch (error) {
    console.error(' Error en getFormAnalytics:', error);
    res
      .status(500)
      .json({
        error: 'Error obteniendo analytics',
        message: error.message
      });
  }
};

/**
 * Obtiene respuestas filtradas por fecha
 */
exports.getFormResponsesByDate = async (req, res) => {
  try {
    const tokensToUse = resolveTokens(req);
    const { formId } = req.params;
    const { startDate, endDate } = req.query;

    if (!tokensToUse) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ error: 'Se requieren startDate y endDate' });
    }

    console.log(` Filtrando respuestas: ${startDate} - ${endDate}`);

    const data = await getFormResponsesByDateRange(
      tokensToUse,
      formId,
      startDate,
      endDate
    );

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error en getFormResponsesByDate:', error);
    res
      .status(500)
      .json({
        error: 'Error filtrando respuestas',
        message: error.message
      });
  }
};

/**
 * Obtiene respuestas agrupadas por pregunta con análisis
 */
exports.getFormResponsesByQuestion = async (req, res) => {
  try {
    const tokensToUse = resolveTokens(req);
    const { formId } = req.params;

    if (!tokensToUse) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    console.log(`📊 Analizando respuestas por pregunta: ${formId}`);

    // Obtener estructura del formulario
    const formStructure = await getFormStructure(tokensToUse, formId);
    const responses = await getFormResponses(tokensToUse, formId);

    if (!responses || responses.length === 0) {
      return res.json({ 
        success: true, 
        questions: [],
        totalResponses: 0 
      });
    }

    // Mapear preguntas
    const questionsMap = {};
    formStructure.items?.forEach(item => {
      if (item.questionItem) {
        const q = item.questionItem.question;
        questionsMap[q.questionId] = {
          questionId: q.questionId,
          title: item.title || 'Sin título',
          type: Object.keys(q)[0], // choiceQuestion, textQuestion, etc.
          options: q.choiceQuestion?.options?.map(opt => opt.value) || [],
        };
      }
    });

    // Analizar respuestas por pregunta
    const questionAnalysis = {};

    responses.forEach(response => {
      if (!response.answers) return;

      Object.entries(response.answers).forEach(([questionId, answer]) => {
        if (!questionsMap[questionId]) return;

        if (!questionAnalysis[questionId]) {
          questionAnalysis[questionId] = {
            ...questionsMap[questionId],
            responses: [],
            answerCounts: {},
            totalAnswers: 0,
          };
        }

        const analysis = questionAnalysis[questionId];
        
        // Extraer la respuesta
        let answerValue = null;
        if (answer.textAnswers?.answers?.[0]?.value) {
          answerValue = answer.textAnswers.answers[0].value;
        } else if (answer.fileUploadAnswers) {
          answerValue = 'Archivo adjunto';
        }

        if (answerValue) {
          analysis.responses.push({
            email: response.respondentEmail || 'Anónimo',
            answer: answerValue,
            timestamp: response.createTime,
          });

          // Contar respuestas
          analysis.answerCounts[answerValue] = 
            (analysis.answerCounts[answerValue] || 0) + 1;
          analysis.totalAnswers++;
        }
      });
    });

    // Calcular porcentajes y formatear para gráficas
    const questionsFormatted = Object.values(questionAnalysis).map(q => {
      const chartData = Object.entries(q.answerCounts).map(([answer, count]) => ({
        answer,
        count,
        percentage: ((count / q.totalAnswers) * 100).toFixed(1),
      }));

      return {
        questionId: q.questionId,
        title: q.title,
        type: q.type,
        totalAnswers: q.totalAnswers,
        chartData: chartData.sort((a, b) => b.count - a.count),
        responses: q.responses,
        isMultipleChoice: q.options.length > 0,
      };
    });

    res.json({
      success: true,
      formTitle: formStructure.info?.title || 'Formulario',
      totalResponses: responses.length,
      questions: questionsFormatted,
    });

  } catch (error) {
    console.error('❌ Error en getFormResponsesByQuestion:', error);
    res.status(500).json({
      error: 'Error analizando respuestas por pregunta',
      message: error.message,
    });
  }
};


/**
 * Exporta respuestas del formulario a CSV
 */
exports.exportFormResponsesToCSV = async (req, res) => {
  try {
    const tokensToUse = resolveTokens(req);
    const { formId } = req.params;

    if (!tokensToUse) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    console.log(` Exportando respuestas del formulario ${formId} a CSV...`);

    const responses = await getFormResponses(tokensToUse, formId);

    if (!responses || responses.length === 0) {
      return res
        .status(404)
        .json({ error: 'No hay respuestas para exportar' });
    }

    const flattenedData = responses.map((response) => {
      const flatResponse = {
        responseId: response.responseId,
        email: response.respondentEmail || 'Anónimo',
        createTime: response.createTime,
        lastSubmittedTime: response.lastSubmittedTime
      };

      if (response.answers) {
        Object.entries(response.answers).forEach(([questionId, answer]) => {
          const questionText = answer.questionId || questionId;
          flatResponse[questionText] =
            answer.textAnswers?.answers?.[0]?.value ||
            answer.fileUploadAnswers?.fileId ||
            JSON.stringify(answer);
        });
      }

      return flatResponse;
    });

    const parser = new Parser();
    const csv = parser.parse(flattenedData);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="form-responses-${formId}.csv"`
    );
    res.send(csv);

    console.log(' CSV exportado correctamente');
  } catch (error) {
    console.error('Error exportando CSV:', error);
    res
      .status(500)
      .json({ error: 'Error al exportar CSV', message: error.message });
  }
};
