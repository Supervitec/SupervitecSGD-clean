require('dotenv').config();
const { google } = require('googleapis');
const axios = require('axios');

async function test() {
  console.log('\n=== DIAGNÓSTICO DE TOKENS Y DRIVE ===\n');

  const token = process.env.ADMIN_ACCESS_TOKEN;
  const fileId = process.env.PREOP_USERS_FILE_ID;

  if (!token) {
    console.error(' ERROR: No hay ADMIN_ACCESS_TOKEN en .env');
    return;
  }

  try {
    console.log('1. Verificando permisos del token...');
    const info = await axios.get(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${token}`);
    console.log(' Token válido. Scopes detectados:');
    console.log(info.data.scope.split(' ')); 
    
    const tieneFullDrive = info.data.scope.includes('https://www.googleapis.com/auth/drive');
    const tieneSheets = info.data.scope.includes('https://www.googleapis.com/auth/spreadsheets');

    if (!tieneFullDrive) console.warn(' ADVERTENCIA: Falta el permiso completo de DRIVE.');
    if (!tieneSheets) console.warn(' ADVERTENCIA: Falta el permiso de SPREADSHEETS.');

  } catch (e) {
    console.error(' El token es inválido o expiró:', e.response?.data || e.message);
    return;
  }

  try {
    console.log(`\n2. Buscando archivo ID: ${fileId}...`);
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: token });
    const drive = google.drive({ version: 'v3', auth });

    const res = await drive.files.get({ fileId: fileId, fields: 'id, name, owners, capabilities' });
    console.log(' Archivo ENCONTRADO:');
    console.log(`   - Nombre: ${res.data.name}`);
    console.log(`   - Dueño: ${res.data.owners?.[0]?.emailAddress}`);
    console.log(`   - ¿Puedo descargarlo?: ${res.data.capabilities?.canDownload}`);

  } catch (e) {
    console.error(' ERROR ACCEDIENDO AL ARCHIVO:');
    console.error(`   Estado: ${e.code || e.response?.status}`);
    console.error(`   Mensaje: ${e.message}`);
    if (e.code === 403) {
        console.log('\nPOSIBLES CAUSAS 403:');
        console.log('1. El token tiene scope "drive.file" (solo ve archivos creados por la app) en vez de "drive" (ver todos).');
        console.log('2. El archivo no está compartido con el dueño del token.');
    }
  }
}

test();
