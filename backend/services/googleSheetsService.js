const { google } = require('googleapis');

/**
 * Obtener cliente de Google Sheets con tokens del usuario/admin
 */
function getSheetsClient(tokens) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oauth2Client.setCredentials(tokens);
  return google.sheets({ version: 'v4', auth: oauth2Client });
}

/**
 * Agregar fila al final de una hoja
 */
async function appendRow(tokens, spreadsheetId, range, values) {
  try {
    console.log(' appendRow llamado con:');
    console.log('   spreadsheetId:', spreadsheetId);
    console.log('   range:', range);
    console.log('   valores:', values.length, 'columnas');
    
    const sheets = getSheetsClient(tokens);
    
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range, 
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS', 
      requestBody: {
        values: [values] 
      }
    });
    
    console.log(` Fila agregada exitosamente a ${spreadsheetId}`);
    return response.data;
    
  } catch (error) {
    console.error(` Error agregando fila a Sheets:`, error.message);
    console.error('   Código de error:', error.code);
    console.error('   Detalles:', error.response?.data?.error || error);
    throw error;
  }
}

/**
 * Actualizar un rango específico 
 */
async function updateRange(tokens, spreadsheetId, range, values) {
  try {
    const sheets = getSheetsClient(tokens);
    
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range, 
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values 
      }
    });
    
    console.log(` Rango actualizado en ${spreadsheetId}: ${range}`);
  } catch (error) {
    console.error(` Error actualizando rango en Sheets:`, error.message);
    throw error;
  }
}

/**
 * Leer valores de un rango
 */
async function getValues(tokens, spreadsheetId, range) {
  try {
    const sheets = getSheetsClient(tokens);
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range
    });
    
    return response.data.values || [];
  } catch (error) {
    console.error(` Error leyendo valores de Sheets:`, error.message);
    throw error;
  }
}

/**
 * Buscar fila por ID y actualizar valores
 */
async function updateRowById(tokens, spreadsheetId, range, idColumn, userId, valuesToUpdate) {
  try {
    const rows = await getValues(tokens, spreadsheetId, range);
    
    const rowIndex = rows.findIndex((row, idx) => {
      if (idx === 0) return false; 
      return String(row[idColumn]).trim() === String(userId).trim();
    });
    
    if (rowIndex === -1) {
      console.warn(` Usuario ${userId} no encontrado en ${range}`);
      return false;
    }
    
    const updatedRow = [...rows[rowIndex]];
    Object.keys(valuesToUpdate).forEach(colIdx => {
      updatedRow[colIdx] = valuesToUpdate[colIdx];
    });
    
    const cellRange = range.split('!')[0] + `!A${rowIndex + 1}`;
    await updateRange(tokens, spreadsheetId, cellRange, [updatedRow]);
    
    console.log(` Fila actualizada para userId: ${userId}`);
    return true;
    
  } catch (error) {
    console.error(` Error actualizando fila por ID:`, error.message);
    throw error;
  }
}

/**
 * Obtener definición del formulario desde Google Sheets
 */
async function getFormDefinitionFromExcel(tokens, vehicleId) {
  try {
    const sheets = getSheetsClient(tokens);
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.FORM_DEFINITIONS_SHEET_ID, 
      range: `${vehicleId}!A2:D`, 
    });
    
    const rows = response.data.values || [];
    
    return {
      vehiculo: vehicleId,
      campos: rows.map(row => ({
        id: row[0],        
        label: row[1],     
        type: row[2],      
        required: row[3] === 'SI' 
      }))
    };
    
  } catch (error) {
    console.error(' Error leyendo definición de formulario:', error);
    return {
      vehiculo: vehicleId,
      campos: [
        { id: 'luces', label: 'Luces', type: 'checkbox', required: true },
        { id: 'frenos', label: 'Frenos', type: 'checkbox', required: true },
        { id: 'observaciones', label: 'Observaciones', type: 'textarea', required: false }
      ]
    };
  }
}

async function clearRange(tokens, spreadsheetId, range) {
  const sheets = getSheetsClient(tokens);
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range,
  });
}

module.exports = {
  appendRow,
  updateRange,
  getValues,
  updateRowById,
  getFormDefinitionFromExcel,
  clearRange,
  getSheetsClient
};
