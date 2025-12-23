const pdfParse = require('pdf-parse');
const XLSX = require('xlsx');

async function extractTextFromPDF(buffer) {
  try {
    if (!Buffer.isBuffer(buffer)) {
      throw new Error('El parámetro debe ser un Buffer válido');
    }
    if (buffer.length === 0) {
      throw new Error('El archivo PDF está vacío');
    }

    console.log(` Procesando PDF de ${buffer.length} bytes...`);

    const data = await pdfParse(buffer);
    
    let cleanText = data.text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');

    console.log(` Texto limpio extraído (${cleanText.length} caracteres)`);

    if (!cleanText || cleanText.length === 0) {
      return ' El PDF no contiene texto extraíble.\n\nEste documento puede estar compuesto principalmente de imágenes o contenido no seleccionable.';
    }

    const uniqueLines = [...new Set(cleanText.split('\n'))];
    if (uniqueLines.length <= 5 && cleanText.length < 200) {
      return ` Contenido extraído del PDF:\n\n${cleanText}\n\n Nota: Este PDF contiene contenido limitado o es principalmente visual. Es posible que el documento original tenga más información en formato de imágenes que no puede ser extraída como texto.`;
    }

    return cleanText;
  } catch (err) {
    console.error(' Error leyendo PDF:', err);
    throw new Error(`Error al procesar PDF: ${err.message}`);
  }
}

function extractDataFromExcel(buffer) {
  try {
    if (!Buffer.isBuffer(buffer)) {
      throw new Error('El parámetro debe ser un Buffer válido');
    }
    if (buffer.length === 0) {
      throw new Error('El archivo Excel está vacío');
    }

    console.log(` Procesando Excel de ${buffer.length} bytes...`);

    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames;
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    console.log(` Datos extraídos: ${data.length} filas`);

    return data;
  } catch (err) {
    console.error(' Error leyendo Excel:', err);
    throw new Error(`Error al procesar Excel: ${err.message}`);
  }
}

module.exports = {
  extractTextFromPDF,
  extractDataFromExcel
};
