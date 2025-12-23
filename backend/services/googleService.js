/* eslint-env node */
const { google } = require('googleapis');
const { setCredentials } = require('../config/google-auth');

// ================= TOKENS DE ADMIN PARA FORMS =================

let adminTokens = null;

function setAdminTokens(tokens) {
  adminTokens = tokens;
  console.log(' Tokens de ADMIN almacenados en memoria para Google Forms');
}

function getAdminTokensUnsafe() {
  return adminTokens;
}

// ================= CONTROLADORES HTTP DRIVE =================

/**
 * Obtiene todos los archivos de Drive
 */
exports.getFiles = async (req, res) => {
  try {
    const tokens = req.session?.tokens;
    const parentId = req.query.parentId || 'root';
    const maxResults = parseInt(req.query.limit) || 100;

    if (!tokens) return res.status(401).json({ error: 'No autenticado' });

    const files = await getDriveFiles(tokens, maxResults);
    res.json({ success: true, count: files.length, files });
  } catch (error) {
    res
      .status(500)
      .json({ error: 'Error obteniendo archivos de Drive', message: error.message });
  }
};

/**
 * Busca archivos en Drive por cadena query
 */
exports.searchFiles = async (req, res) => {
  try {
    const tokens = req.session?.tokens;
    const query = req.query.q || '';
    const maxResults = parseInt(req.query.limit) || 50;

    if (!tokens) return res.status(401).json({ error: 'No autenticado' });
    if (!query)
      return res
        .status(400)
        .json({ error: 'Se requiere parámetro de búsqueda "q"' });

    console.log(` Buscando archivos: "${query}"`);

    const files = await searchDriveFiles(tokens, query, maxResults);
    res.json({ success: true, query, count: files.length, files });
  } catch (error) {
    console.error('Error en searchFiles:', error);
    res
      .status(500)
      .json({ error: 'Error buscando archivos', message: error.message });
  }
};



/**
 * Obtiene todas las carpetas de Drive
 */
exports.getFolders = async (req, res) => {
  try {
    const tokens = req.session?.tokens;
    const maxResults = parseInt(req.query.limit) || 50;

    if (!tokens) return res.status(401).json({ error: 'No autenticado' });

    console.log(' Obteniendo carpetas de Drive...');

    const folders = await getDriveFolders(tokens, maxResults);
    res.json({ success: true, count: folders.length, folders });
  } catch (error) {
    console.error('Error en getFolders:', error);
    res
      .status(500)
      .json({ error: 'Error obteniendo carpetas', message: error.message });
  }
};

/**
 * Obtiene archivos dentro de carpeta específica
 */
exports.getFilesInFolderController = async (req, res) => {
  try {
    const tokens = req.session?.tokens;
    const { folderId } = req.params;
    const maxResults = parseInt(req.query.limit) || 100;

    if (!tokens) return res.status(401).json({ error: 'No autenticado' });

    console.log(` Obteniendo archivos de carpeta ${folderId}...`);

    const files = await getFilesInFolder(tokens, folderId, maxResults);
    res.json({ success: true, folderId, count: files.length, files });
  } catch (error) {
    console.error('Error en getFilesInFolder:', error);
    res
      .status(500)
      .json({ error: 'Error obteniendo archivos de carpeta', message: error.message });
  }
};

/**
 * Obtiene metadatos de un archivo
 */
exports.getFileMetadataController = async (req, res) => {
  try {
    const tokens = req.session?.tokens;
    const { fileId } = req.params;

    if (!tokens) return res.status(401).json({ error: 'No autenticado' });

    console.log(` Obteniendo metadata de archivo ${fileId}...`);

    const metadata = await getDriveFileMetadata(tokens, fileId);
    res.json({ success: true, file: metadata });
  } catch (error) {
    console.error('Error en getFileMetadata:', error);
    res
      .status(500)
      .json({ error: 'Error obteniendo metadata', message: error.message });
  }
};

/**
 * Busca archivos relacionados con proyectos 
 */
exports.getProjectFiles = async (req, res) => {
  try {
    const tokens = req.session?.tokens;
    const maxResults = parseInt(req.query.limit) || 100;

    if (!tokens) return res.status(401).json({ error: 'No autenticado' });

    const query = 'proyecto';
    console.log('🏗 Buscando archivos de proyectos...');

    const files = await searchDriveFiles(tokens, query, maxResults);
    res.json({ success: true, query, count: files.length, files });
  } catch (error) {
    console.error('Error en getProjectFiles:', error);
    res
      .status(500)
      .json({ error: 'Error obteniendo archivos de proyectos', message: error.message });
  }
};

// ================= GMAIL  =================

async function getGmailMessages(tokens, maxResults = 50) {
  try {
    const auth = setCredentials(tokens);
    const gmail = google.gmail({ version: 'v1', auth });

    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      maxResults,
      q: ''
    });

    if (!listResponse.data.messages || listResponse.data.messages.length === 0) {
      return [];
    }

    console.log(` Encontrados ${listResponse.data.messages.length} correos`);

    const messagePromises = listResponse.data.messages.map((msg) =>
      gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'full'
      })
    );

    const messagesData = await Promise.all(messagePromises);

    const emails = messagesData.map((msgResponse) => {
      const message = msgResponse.data;
      const headers = message.payload.headers;

      const from = headers.find((h) => h.name === 'From')?.value || '';
      const subject =
        headers.find((h) => h.name === 'Subject')?.value || 'Sin asunto';
      const date = headers.find((h) => h.name === 'Date')?.value || '';
      const to = headers.find((h) => h.name === 'To')?.value || '';
      const snippet = message.snippet || '';

      return {
        id: message.id,
        threadId: message.threadId,
        from,
        to,
        subject,
        date: new Date(date),
        snippet,
        hasAttachments:
          message.payload.parts?.some((part) => part.filename) || false,
        labels: message.labelIds || []
      };
    });

    return emails;
  } catch (error) {
    console.error(' Error obteniendo correos de Gmail:', error);
    throw new Error('No se pudieron obtener los correos de Gmail');
  }
}

async function searchGmailMessages(tokens, query, maxResults = 50) {
  try {
    const auth = setCredentials(tokens);
    const gmail = google.gmail({ version: 'v1', auth });

    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      maxResults,
      q: query
    });

    if (!listResponse.data.messages || listResponse.data.messages.length === 0) {
      return [];
    }

    console.log(
      ` Búsqueda "${query}" encontró ${listResponse.data.messages.length} correos`
    );

    const messagePromises = listResponse.data.messages.map((msg) =>
      gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'full'
      })
    );

    const messagesData = await Promise.all(messagePromises);

    const emails = messagesData.map((msgResponse) => {
      const message = msgResponse.data;
      const headers = message.payload.headers;

      const from = headers.find((h) => h.name === 'From')?.value || '';
      const subject =
        headers.find((h) => h.name === 'Subject')?.value || 'Sin asunto';
      const date = headers.find((h) => h.name === 'Date')?.value || '';
      const snippet = message.snippet || '';

      return {
        id: message.id,
        from,
        subject,
        date: new Date(date),
        snippet
      };
    });

    return emails;
  } catch (error) {
    console.error(' Error buscando correos:', error);
    throw error;
  }
}

async function getGmailMessageById(tokens, messageId) {
  try {
    const auth = setCredentials(tokens);
    const gmail = google.gmail({ version: 'v1', auth });

    const message = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full'
    });

    return message.data;
  } catch (error) {
    console.error(' Error obteniendo correo:', error);
    throw error;
  }
}

async function getGmailMessageWithAttachments(tokens, messageId) {
  try {
    const auth = setCredentials(tokens);
    const gmail = google.gmail({ version: 'v1', auth });

    console.log(` Obteniendo mensaje ${messageId} con adjuntos...`);

    const message = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full'
    });

    const data = message.data;
    const headers = data.payload.headers;

    const from = headers.find((h) => h.name === 'From')?.value || '';
    const to = headers.find((h) => h.name === 'To')?.value || '';
    const subject = headers.find((h) => h.name === 'Subject')?.value || 'Sin asunto';
    const date = headers.find((h) => h.name === 'Date')?.value || '';
    const cc = headers.find((h) => h.name === 'Cc')?.value || '';

    let textBody = '';
    let htmlBody = '';

    function extractBody(parts) {
      if (!parts) return;
      
      parts.forEach((part) => {
        if (part.mimeType === 'text/plain' && part.body.data) {
          textBody = Buffer.from(part.body.data, 'base64').toString('utf-8');
        }
        if (part.mimeType === 'text/html' && part.body.data) {
          htmlBody = Buffer.from(part.body.data, 'base64').toString('utf-8');
        }
        if (part.parts) {
          extractBody(part.parts);
        }
      });
    }

    if (data.payload.body?.data) {
      const decoded = Buffer.from(data.payload.body.data, 'base64').toString('utf-8');
      if (data.payload.mimeType === 'text/html') {
        htmlBody = decoded;
      } else {
        textBody = decoded;
      }
    } else if (data.payload.parts) {
      extractBody(data.payload.parts);
    }

    const attachments = [];

    function extractAttachments(parts) {
      if (!parts) return;
      
      parts.forEach((part) => {
        if (part.filename && part.body.attachmentId) {
          attachments.push({
            filename: part.filename,
            mimeType: part.mimeType,
            size: part.body.size,
            attachmentId: part.body.attachmentId
          });
        }
        if (part.parts) {
          extractAttachments(part.parts);
        }
      });
    }

    if (data.payload.parts) {
      extractAttachments(data.payload.parts);
    }

    console.log(` Correo obtenido: ${attachments.length} adjuntos`);

    return {
      id: data.id,
      threadId: data.threadId,
      from,
      to,
      cc,
      subject,
      date,
      bodyText: textBody,    
      bodyHtml: htmlBody,     
      snippet: data.snippet,
      attachments,
      labels: data.labelIds || []
    };
  } catch (error) {
    console.error(' Error obteniendo correo con adjuntos:', error);
    throw error;
  }
}


async function downloadGmailAttachment(tokens, messageId, attachmentId) {
  try {
    const auth = setCredentials(tokens);
    const gmail = google.gmail({ version: 'v1', auth });

    console.log(` Descargando adjunto ${attachmentId} del mensaje ${messageId}...`);

    const attachment = await gmail.users.messages.attachments.get({
      userId: 'me',
      messageId: messageId,
      id: attachmentId
    });

    const data = attachment.data.data;
    const buffer = Buffer.from(data, 'base64');

    console.log(` Adjunto descargado: ${buffer.length} bytes`);

    return buffer;
  } catch (error) {
    console.error(' Error descargando adjunto:', error);
    throw error;
  }
}

// ================= DRIVE HELPERS =================

async function getDriveFiles(tokens, maxResults = 100) {
  try {
    const auth = setCredentials(tokens);
    const drive = google.drive({ version: 'v3', auth });

    const response = await drive.files.list({
      q: "mimeType!='application/vnd.google-apps.form'",
      pageSize: maxResults,
      fields:
        'files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, iconLink, parents)',
      orderBy: 'modifiedTime desc'
    });

    const files = response.data.files || [];

    console.log(` Encontrados ${files.length} archivos en Drive`);

    return files.map((file) => ({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      size: file.size ? parseInt(file.size) : 0,
      createdTime: file.createdTime,
      modifiedTime: file.modifiedTime,
      webViewLink: file.webViewLink,
      iconLink: file.iconLink,
      parents: file.parents || []
    }));
  } catch (error) {
    console.error(' Error obteniendo archivos de Drive:', error);
    throw new Error('No se pudieron obtener los archivos de Drive');
  }
}

async function searchDriveFiles(tokens, query, maxResults = 50) {
  try {
    const auth = setCredentials(tokens);
    const drive = google.drive({ version: 'v3', auth });

    let driveQuery = '';
    if (query) {
      driveQuery = `name contains '${query}' or fullText contains '${query}'`;
    }

    const response = await drive.files.list({
      q: driveQuery,
      pageSize: maxResults,
      fields:
        'files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, iconLink)',
      orderBy: 'modifiedTime desc'
    });

    const files = response.data.files || [];

    console.log(` Búsqueda "${query}" encontró ${files.length} archivos`);

    return files.map((file) => ({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      size: file.size ? parseInt(file.size) : 0,
      createdTime: file.createdTime,
      modifiedTime: file.modifiedTime,
      webViewLink: file.webViewLink,
      iconLink: file.iconLink
    }));
  } catch (error) {
    console.error(' Error buscando archivos:', error);
    throw error;
  }
}

async function getDriveFolders(tokens, maxResults = 50) {
  try {
    const auth = setCredentials(tokens);
    const drive = google.drive({ version: 'v3', auth });

    const response = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.folder'",
      pageSize: maxResults,
      fields:
        'files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, iconLink, parents)',
      orderBy: 'modifiedTime desc'
    });

    const folders = response.data.files || [];
    console.log(` Encontradas ${folders.length} carpetas`);

    return folders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      mimeType: folder.mimeType,
      createdTime: folder.createdTime,
      modifiedTime: folder.modifiedTime,
      webViewLink: folder.webViewLink,
      iconLink: folder.iconLink,
      parents: folder.parents || []
    }));
  } catch (error) {
    console.error(' Error obteniendo carpetas:', error);
    throw error;
  }
}

async function getFilesInFolder(tokens, folderId = 'root', maxResults = 100) {
  try {
    const auth = setCredentials(tokens);
    const drive = google.drive({ version: 'v3', auth });

    const response = await drive.files.list({
      q: `'${folderId}' in parents`,
      pageSize: maxResults,
      fields:
        'files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, iconLink)',
      orderBy: 'modifiedTime desc'
    });

    const files = response.data.files || [];

    console.log(` Carpeta ${folderId}: ${files.length} archivos`);

    return files;
  } catch (error) {
    console.error(' Error obteniendo archivos de carpeta:', error);
    throw error;
  }
}

async function downloadDriveFile(tokens, fileId) {
  try {
    const auth = setCredentials(tokens);
    const drive = google.drive({ version: 'v3', auth });

    const response = await drive.files.get(
      {
        fileId,
        alt: 'media'
      },
      { responseType: 'stream' }
    );

    return response.data;
  } catch (error) {
    console.error(' Error descargando archivo:', error);
    throw error;
  }
}

async function getDriveFileMetadata(tokens, fileId) {
  try {
    const auth = setCredentials(tokens);
    const drive = google.drive({ version: 'v3', auth });

    const response = await drive.files.get({
      fileId,
      fields:
        'id, name, mimeType, size, createdTime, modifiedTime, webViewLink, iconLink, owners, permissions'
    });

    return response.data;
  } catch (error) {
    console.error(' Error obteniendo metadata:', error);
    throw error;
  }
}

// ================= GOOGLE FORMS HELPERS =================

/**
 * Formularios del ADMIN 
 */
async function getAdminForms(maxResults = 50) {
  if (!adminTokens) {
    console.warn(' Admin aún no ha iniciado sesión, no hay formularios.');
    return [];
  }
  return getGoogleForms(adminTokens, maxResults);
}

/**
 * Lista de formularios usando los tokens dados 
 */
async function getGoogleForms(tokens, maxResults = 50) {
  try {
    const auth = setCredentials(tokens);
    const drive = google.drive({ version: 'v3', auth });

    const oauth2 = google.oauth2({ version: 'v2', auth });
    const { data: ownerInfo } = await oauth2.userinfo.get();
    console.log(`Buscando formularios de: ${ownerInfo.email}`);

    const response = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.form' and 'me' in owners",
      pageSize: maxResults,
      fields:
        'files(id, name, createdTime, modifiedTime, webViewLink, iconLink, description)',
      orderBy: 'modifiedTime desc'
    });

    const forms = response.data.files || [];
    console.log(`Encontrados ${forms.length} formularios de ${ownerInfo.email}`);

    return forms.map((form) => ({
      id: form.id,
      name: form.name,
      description: form.description || '',
      createdTime: form.createdTime,
      modifiedTime: form.modifiedTime,
      webViewLink: form.webViewLink,
      iconLink: form.iconLink
    }));
  } catch (error) {
    console.error('Error obteniendo formularios:', error);
    throw new Error('No se pudieron obtener los formularios de Google Forms');
  }
}

async function getFormStructure(tokens, formId) {
  try {
    const auth = setCredentials(tokens);
    const forms = google.forms({ version: 'v1', auth });

    const response = await forms.forms.get({ formId });
    return response.data;
  } catch (error) {
    console.error(`Error obteniendo estructura del formulario ${formId}:`, error);
    throw error;
  }
}

async function getFormResponses(tokens, formId) {
  try {
    const auth = setCredentials(tokens);
    const forms = google.forms({ version: 'v1', auth });

    const response = await forms.forms.responses.list({ formId });
    const responses = response.data.responses || [];

    console.log(` Formulario tiene ${responses.length} respuestas`);

    return responses;
  } catch (error) {
    console.error(`Error obteniendo respuestas del formulario ${formId}:`, error);
    throw error;
  }
}

async function getFormResponsesWithAnalytics(tokens, formId) {
  try {
    const auth = setCredentials(tokens);
    const forms = google.forms({ version: 'v1', auth });

    const formStructure = await forms.forms.get({ formId });
    const responsesData = await forms.forms.responses.list({ formId });
    const responses = responsesData.data.responses || [];

    console.log(` Analizando ${responses.length} respuestas del formulario...`);

    const userStats = {};
    responses.forEach((response) => {
      const email = response.respondentEmail || 'Anónimo';
      if (!userStats[email]) {
        userStats[email] = {
          count: 0,
          lastResponse: null,
          responses: []
        };
      }

      userStats[email].count++;
      userStats[email].responses.push({
        responseId: response.responseId,
        createTime: response.createTime,
        lastSubmittedTime: response.lastSubmittedTime
      });

      const responseTime = new Date(
        response.lastSubmittedTime || response.createTime
      );
      if (
        !userStats[email].lastResponse ||
        responseTime > new Date(userStats[email].lastResponse)
      ) {
        userStats[email].lastResponse =
          response.lastSubmittedTime || response.createTime;
      }
    });

    return {
      formId,
      formTitle: formStructure.data.info.title,
      totalResponses: responses.length,
      userStats,
      responses
    };
  } catch (error) {
    console.error(' Error obteniendo respuestas con analytics:', error);
    throw error;
  }
}

async function getFormResponsesByDateRange(tokens, formId, startDate, endDate) {
  try {
    const data = await getFormResponsesWithAnalytics(tokens, formId);

    const start = new Date(startDate);
    const end = new Date(endDate);

    const filteredResponses = data.responses.filter((response) => {
      const responseDate = new Date(response.createTime);
      return responseDate >= start && responseDate <= end;
    });

    const userStats = {};
    filteredResponses.forEach((response) => {
      const email = response.respondentEmail || 'Anónimo';
      if (!userStats[email]) {
        userStats[email] = { count: 0 };
      }
      userStats[email].count++;
    });

    return {
      ...data,
      totalResponses: filteredResponses.length,
      userStats,
      responses: filteredResponses,
      dateRange: { startDate, endDate }
    };
  } catch (error) {
    console.error(' Error filtrando respuestas por fecha:', error);
    throw error;
  }
}

module.exports = {
  setAdminTokens,
  getAdminTokensUnsafe,
  getAdminForms,
  getGoogleForms,
  getFormStructure,
  getFormResponses,
  getFormResponsesWithAnalytics,
  getFormResponsesByDateRange,
  getGmailMessages,
  searchGmailMessages,
  getGmailMessageById,
  getGmailMessageWithAttachments, 
  downloadGmailAttachment,
  getDriveFiles,
  searchDriveFiles,
  getDriveFolders,
  getFilesInFolder,
  downloadDriveFile,
  getDriveFileMetadata
};
