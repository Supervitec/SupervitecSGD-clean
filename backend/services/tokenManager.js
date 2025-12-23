let adminTokens = null;

/**
 * Guardar tokens del admin cuando inicia sesión
 */
function setAdminTokens(tokens) {
  adminTokens = tokens;
  console.log(' Tokens de admin guardados en tokenManager');
}

/**
 * Obtener tokens del admin 
 */
function getAdminTokens() {
  if (!adminTokens) {
    console.warn(' No hay tokens de admin disponibles');
    return null;
  }
  return adminTokens;
}

/**
 * Limpiar tokens del admin 
 */
function clearAdminTokens() {
  adminTokens = null;
  console.log(' Tokens de admin limpiados');
}

module.exports = {
  setAdminTokens,
  getAdminTokens,
  clearAdminTokens
};
