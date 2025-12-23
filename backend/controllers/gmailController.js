const {
searchGmailMessages,
getGmailMessages,
getGmailMessageById,
getGmailMessageWithAttachments,
downloadGmailAttachment
} = require('../services/googleService');

/**

Obtiene los últimos correos del usuario
*/
exports.getEmails = async (req, res) => {
try {
const tokens = req.session.tokens;
const maxResults = parseInt(req.query.limit) || 50;

if (!tokens) {
return res.status(401).json({ error: 'No autenticado' });
}

console.log(`Obteniendo últimos ${maxResults} correos...`);

const emails = await getGmailMessages(tokens, maxResults);

res.json({
success: true,
count: emails.length,
emails: emails
});

} catch (error) {
console.error(' Error en getEmails:', error);
res.status(500).json({
error: 'Error obteniendo correos',
message: error.message
});
}
};


exports.searchEmails = async (req, res) => {
try {
const tokens = req.session.tokens;
const query = req.query.q || '';
const maxResults = parseInt(req.query.limit) || 50;

if (!tokens) {
return res.status(401).json({ error: 'No autenticado' });
}

if (!query) {
return res.status(400).json({ error: 'Se requiere parámetro de búsqueda "q"' });
}

console.log(`Buscando correos: "${query}"`);

const emails = await searchGmailMessages(tokens, query, maxResults);

res.json({
success: true,
query: query,
count: emails.length,
emails: emails
});

} catch (error) {
console.error(' Error en searchEmails:', error);
res.status(500).json({
error: 'Error buscando correos',
message: error.message
});
}
};


exports.getProjectEmails = async (req, res) => {
try {
const tokens = req.session.tokens;
const maxResults = parseInt(req.query.limit) || 50;

if (!tokens) {
console.log(' No hay tokens en la sesión');
return res.status(401).json({ error: 'No autenticado' });
}

const query = 'in:inbox';

console.log(`[Backend] 1. Buscando correos con query: "${query}"`);

const emails = await searchGmailMessages(tokens, query, maxResults);

console.log(`[Backend] 2. searchGmailMessages devolvió ${emails.length} correos`);

if (emails.length > 0) {
console.log('[Backend] 3. Primer correo de ejemplo:', {
id: emails.id,
from: emails.from,
subject: emails.subject
});
}

res.json({
success: true,
query: query,
count: emails.length,
emails: emails
});

} catch (error) {
console.error(' Error fatal en getProjectEmails:', error);
console.error('Stack trace:', error.stack);
res.status(500).json({
error: 'Error obteniendo correos de proyectos',
message: error.message
});
}
};

/**

Obtiene un correo específico
*/
exports.getEmailById = async (req, res) => {
try {
const tokens = req.session.tokens;
const { id } = req.params;

if (!tokens) {
return res.status(401).json({ error: 'No autenticado' });
}

console.log(`Obteniendo correo ${id}...`);

const email = await getGmailMessageById(tokens, id);

res.json({
success: true,
email: email
});

} catch (error) {
console.error(' Error en getEmailById:', error);
res.status(500).json({
error: 'Error obteniendo correo',
message: error.message
});
}
};

/**

Obtiene un correo completo con adjuntos
*/
exports.getEmailWithAttachments = async (req, res) => {
try {
const tokens = req.session.tokens;
const { id } = req.params;

if (!tokens) {
return res.status(401).json({ error: 'No autenticado' });
}

console.log(`Obteniendo correo completo ${id} ...`);

const email = await getGmailMessageWithAttachments(tokens, id);

res.json({
success: true,
email: email
});

} catch (error) {
console.error(' Error en getEmailWithAttachments:', error);
res.status(500).json({
error: 'Error obteniendo correo completo',
message: error.message
});
}
};

/**

Descarga un adjunto de un correo
*/
exports.downloadAttachment = async (req, res) => {
try {
const tokens = req.session?.tokens;
const { messageId, attachmentId } = req.params;
const { filename } = req.query;

if (!tokens) {
return res.status(401).json({ error: 'No autenticado' });
}

console.log(`Descargando adjunto ${filename || attachmentId}...`);

const attachmentData = await downloadGmailAttachment(tokens, messageId, attachmentId);

res.setHeader('Content-Disposition', `attachment; filename="${filename || 'attachment'}"`);
res.setHeader('Content-Type', 'application/octet-stream');
res.send(attachmentData);

} catch (error) {
console.error(' Error en downloadAttachment:', error);
res.status(500).json({
error: 'Error descargando adjunto',
message: error.message
});
}
};