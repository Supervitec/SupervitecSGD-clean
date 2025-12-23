const { google } = require('googleapis');
const path = require('path');

const serviceAccountPath = path.join(__dirname, '../config/service-account.json');

const auth = new google.auth.GoogleAuth({
  keyFile: serviceAccountPath,
  scopes: ['https://www.googleapis.com/auth/drive.readonly'],
});

async function checkDriveAccess() {
  try {
    const drive = google.drive({ version: 'v3', auth });
    
    console.log(' Service Account autenticada correctamente\n');
    console.log(' Listando archivos accesibles en Drive:\n');

    const res = await drive.files.list({
      pageSize: 50,
      fields: 'files(id, name, mimeType, createdTime)',
      orderBy: 'createdTime desc'
    });

    const files = res.data.files;
    
    if (files.length === 0) {
      console.log(' No se encontraron archivos. La Service Account no tiene acceso a ningún archivo.');
      console.log('\n Email de Service Account para compartir:');
      const serviceAccount = require(serviceAccountPath);
      console.log(serviceAccount.client_email);
      return;
    }

    console.log(`Se encontraron ${files.length} archivos:\n`);
    files.forEach((file, index) => {
      console.log(`${index + 1}. ${file.name}`);
      console.log(`   ID: ${file.id}`);
      console.log(`   Tipo: ${file.mimeType}`);
      console.log(`   Creado: ${file.createdTime}\n`);
    });

    const targetId = '19e64WrrYhgB_K_BQGP6EVVYH95SeuXX1';
    console.log(`\n Verificando acceso al archivo objetivo: ${targetId}`);
    
    try {
      const fileInfo = await drive.files.get({
        fileId: targetId,
        fields: 'id, name, mimeType'
      });
      console.log(' Archivo encontrado:');
      console.log(`   Nombre: ${fileInfo.data.name}`);
      console.log(`   Tipo: ${fileInfo.data.mimeType}`);
    } catch (error) {
      console.log(' No se puede acceder al archivo objetivo');
      console.log(`   Error: ${error.message}`);
    }

  } catch (error) {
    console.error(' Error:', error.message);
  }
}

checkDriveAccess();
