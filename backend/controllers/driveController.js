const { 
  getDriveFiles,
  searchDriveFiles,
  getDriveFolders,
  getFilesInFolder,
  getDriveFileMetadata
} = require('../services/googleService');

/**
 * Obtiene todos los archivos de Drive
 */
exports.getFiles = async (req, res) => {
  try {
    const tokens = req.session.tokens;
    const parentId = req.query.parentId || "root";
    const maxResults = parseInt(req.query.limit) || 100;
    if (!tokens) return res.status(401).json({ error: 'No autenticado' });
    const files = await getDriveFiles(tokens, parentId, maxResults);
    res.json({ success: true, count: files.length, files });
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo archivos de Drive', message: error.message });
  }
};

/**
 * Busca archivos en Drive
 */
exports.searchFiles = async (req, res) => {
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

    console.log(`Buscando archivos: "${query}"`);

    const files = await searchDriveFiles(tokens, query, maxResults);

    res.json({
      success: true,
      query: query,
      count: files.length,
      files: files
    });

  } catch (error) {
    console.error(' Error en searchFiles:', error);
    res.status(500).json({
      error: 'Error buscando archivos',
      message: error.message
    });
  }
};

/**
 * Obtiene todas las carpetas
 */
exports.getFolders = async (req, res) => {
  try {
    const tokens = req.session.tokens;
    const maxResults = parseInt(req.query.limit) || 50;

    if (!tokens) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    console.log(`Obteniendo carpetas de Drive...`);

    const folders = await getDriveFolders(tokens, maxResults);

    res.json({
      success: true,
      count: folders.length,
      folders: folders
    });

  } catch (error) {
    console.error(' Error en getFolders:', error);
    res.status(500).json({
      error: 'Error obteniendo carpetas',
      message: error.message
    });
  }
};

/**
 * Obtiene archivos de una carpeta específica
 */
exports.getFilesInFolder = async (req, res) => {
  try {
    const tokens = req.session.tokens;
    const { folderId } = req.params;
    const maxResults = parseInt(req.query.limit) || 100;

    if (!tokens) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    console.log(` Obteniendo archivos de carpeta ${folderId}...`);

    const files = await getFilesInFolder(tokens, folderId, maxResults);

    res.json({
      success: true,
      folderId: folderId,
      count: files.length,
      files: files
    });

  } catch (error) {
    console.error(' Error en getFilesInFolder:', error);
    res.status(500).json({
      error: 'Error obteniendo archivos de carpeta',
      message: error.message
    });
  }
};

/**
 * Obtiene metadata de un archivo
 */
exports.getFileMetadata = async (req, res) => {
  try {
    const tokens = req.session.tokens;
    const { fileId } = req.params;

    if (!tokens) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    console.log(`Obteniendo metadata de archivo ${fileId}...`);

    const metadata = await getDriveFileMetadata(tokens, fileId);

    res.json({
      success: true,
      file: metadata
    });

  } catch (error) {
    console.error(' Error en getFileMetadata:', error);
    res.status(500).json({
      error: 'Error obteniendo metadata',
      message: error.message
    });
  }
};

/**
 * Busca archivos relacionados con proyectos
 */
exports.getProjectFiles = async (req, res) => {
  try {
    const tokens = req.session.tokens;
    const maxResults = parseInt(req.query.limit) || 100;

    if (!tokens) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const query = 'proyecto';

    console.log(`Buscando archivos de proyectos...`);

    const files = await searchDriveFiles(tokens, query, maxResults);

    res.json({
      success: true,
      query: query,
      count: files.length,
      files: files
    });

  } catch (error) {
    console.error(' Error en getProjectFiles:', error);
    res.status(500).json({
      error: 'Error obteniendo archivos de proyectos',
      message: error.message
    });
  }
};
