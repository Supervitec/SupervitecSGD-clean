const { google } = require('googleapis');
require('dotenv').config();

const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/forms.body.readonly',
  'https://www.googleapis.com/auth/forms.responses.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/calendar.events',
];

function getAuthUrl() {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    include_granted_scopes: true,
    prompt: 'consent'
  });
}

async function getTokenFromCode(code) {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    return tokens;
  } catch (error) {
    console.error('Error obteniendo tokens:', error);
    throw new Error('No se pudieron obtener los tokens de Google');
  }
}

function setCredentials(tokens) {
  oauth2Client.setCredentials(tokens);
  return oauth2Client;
}

async function refreshAccessToken(refreshToken) {
  try {
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await oauth2Client.refreshAccessToken();
    console.log(' Token refrescado automáticamente');
    return credentials;
  } catch (error) {
    console.error(' Error refrescando token:', error);
    throw new Error('No se pudo refrescar el token');
  }
}

async function getUserInfo(tokens) {
  try {
    const oauth2 = google.oauth2({ auth: oauth2Client, version: 'v2' });
    setCredentials(tokens);
    const { data } = await oauth2.userinfo.get();
    return { email: data.email, name: data.name, picture: data.picture };
  } catch (error) {
    console.error('Error obteniendo info del usuario:', error);
    throw error;
  }
}

function getOAuth2Client() {
  return oauth2Client;
}

module.exports = {
  oauth2Client,
  getAuthUrl,
  getTokenFromCode,
  setCredentials,
  getUserInfo,
  refreshAccessToken,
  getOAuth2Client,
  SCOPES
};
