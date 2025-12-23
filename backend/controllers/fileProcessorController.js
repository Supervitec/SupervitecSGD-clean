const { extractTextFromPDF, extractDataFromExcel } = require('../services/fileProcessor');

/**
 * Procesa un archivo adjunto recibido como base64 y retorna el texto o datos extraídos.
 */
exports.processAttachment = async (req, res) => {
  try {
    const { base64File, filename } = req.body;

    if (!base64File || !filename) {
      return res.status(400).json({ 
        error: 'Datos incompletos',
        message: 'Se requiere "base64File" y "filename"'
      });
    }

    console.log(` Procesando archivo: ${filename}`);

    let buffer;
    try {
      buffer = Buffer.from(base64File, 'base64');
    } catch (err) {
      return res.status(400).json({
        error: 'Formato base64 inválido',
        message: 'El archivo no tiene un formato base64 válido'
      });
    }

    console.log(` Buffer creado: ${buffer.length} bytes`);

    let data;

    if (filename.toLowerCase().endsWith('.pdf')) {
      console.log('Tipo de archivo: PDF');
      data = await extractTextFromPDF(buffer);
    } else if (filename.toLowerCase().endsWith('.xls') || filename.toLowerCase().endsWith('.xlsx')) {
      console.log('Tipo de archivo: Excel');
      data = extractDataFromExcel(buffer);
    } else {
      return res.status(400).json({ 
        error: 'Formato no soportado',
        message: 'Solo se admiten archivos PDF (.pdf) y Excel (.xls, .xlsx)'
      });
    }

    console.log(' Archivo procesado exitosamente');

    res.json({ 
      success: true, 
      filename: filename,
      data: data 
    });

  } catch (error) {
    console.error(' Error procesando archivo:', error);
    res.status(500).json({ 
      error: 'Error al procesar archivo', 
      message: error.message 
    });
  }
};