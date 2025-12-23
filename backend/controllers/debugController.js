const XLSX = require('xlsx');
const { google } = require('googleapis');
const { setCredentials } = require('../config/google-auth'); 

const SHEET_NAME = '2025'; 

exports.getConsolidatedHeaders = async (req, res) => {
  try {
    const tokens = req.session?.tokens;
    if (!tokens) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const fileId = process.env.CONSOLIDATED_FILE_ID;
    if (!fileId) {
      return res.status(500).json({ error: 'CONSOLDATED_FILE_ID no definido' });
    }

    const auth = setCredentials(tokens);
    const drive = google.drive({ version: 'v3', auth });

    const response = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );

    const buffer = Buffer.from(response.data);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[SHEET_NAME];

    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    console.log('Primeras filas de la hoja 2025:');
    rows.slice(0, 15).forEach((row, rIdx) => {
      console.log('Fila', rIdx, '=>', row);
    });

    const preview = rows.slice(0, 15).map((row, rIdx) => ({
      rowIndex: rIdx,
      row,
    }));

    res.json({ success: true, sheet: SHEET_NAME, preview });
  } catch (err) {
    console.error('Error getConsolidatedHeaders:', err);
    res.status(500).json({ error: 'Error leyendo encabezados', message: err.message });
  }
};
exports.getConsolidatedHeaders = async (req, res) => {
  try {
    const tokens = req.session?.tokens;
    if (!tokens) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const fileId = process.env.CONSOLIDATED_FILE_ID;
    if (!fileId) {
      return res.status(500).json({ error: 'CONSOLDATED_FILE_ID no definido' });
    }

    const auth = setCredentials(tokens);
    const drive = google.drive({ version: 'v3', auth });

    const response = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );

    const buffer = Buffer.from(response.data);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[SHEET_NAME];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    console.log('Primeras filas de la hoja 2025:');
    rows.slice(0, 15).forEach((row, rIdx) => {
      console.log('Fila', rIdx, '=>', row);
    });

    const preview = rows.slice(0, 15).map((row, rIdx) => ({
      rowIndex: rIdx,
      row,
    }));

    res.json({ success: true, sheet: SHEET_NAME, preview });
  } catch (err) {
    console.error('Error getConsolidatedHeaders:', err);
    res.status(500).json({ error: 'Error leyendo encabezados', message: err.message });
  }
};