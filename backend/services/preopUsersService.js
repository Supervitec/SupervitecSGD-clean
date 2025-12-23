const { getValues, updateRange, clearRange } = require('./googleSheetsService'); // 👈 agrego clearRange

const USERS_SHEET_ID = process.env.PREOP_USERS_FILE_ID || process.env.SPREADSHEET_ID;
const USERS_RANGE = 'Hoja 1!A2:D';

function ensureSheetId() {
  if (!USERS_SHEET_ID) {
    throw new Error('PREOP_USERS_FILE_ID no está configurado en .env');
  }
}

function mapRowToUser(row = []) {
  return {
    ID: row[0] || '',
    NOMBRE: row[1] || '',
    TIPO: row[2] || '',
    ACTIVO: row[3] || 'SI',
  };
}

function mapUserToRow(user) {
  return [
    user.ID || '',
    user.NOMBRE || '',
    user.TIPO || '',
    user.ACTIVO || 'SI',
  ];
}

function normalize(str) {
  return (str ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function nameKey(str) {
  return normalize(str).split(' ').filter(Boolean).sort().join(' ');
}

function tokenScore(a, b) {
  const A = new Set(nameKey(a).split(' '));
  const B = new Set(nameKey(b).split(' '));
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return inter;
}

/**
 * Obtener TODOS los usuarios desde el Sheet
 * Modelo: { ID, NOMBRE, TIPO, ACTIVO }
 */
async function getAllUsers(tokens) {
  ensureSheetId();

  const rows = await getValues(tokens, USERS_SHEET_ID, USERS_RANGE);
  const users = rows
    .map(mapRowToUser)
    .filter(u => u.ID && u.NOMBRE);

  console.log(`Total usuarios encontrados: ${users.length}`);
  return users;
}

/**
 * Lista pública (solo activos)
 */
async function getPublicUsers(tokens) {
  const all = await getAllUsers(tokens);
  return all.filter(u => (u.ACTIVO || '').toUpperCase() === 'SI');
}

/**
 * Guardar lista completa de usuarios en el Sheet
 */
async function saveUsers(users, tokens) {
  ensureSheetId();

  const cleaned = (users || [])
    .map(u => ({
      ID: String(u.ID || '').trim(),
      NOMBRE: String(u.NOMBRE || '').trim(),
      TIPO: (u.TIPO || '').trim().toLowerCase(),
      ACTIVO: (u.ACTIVO || 'SI').toUpperCase() === 'SI' ? 'SI' : 'NO',
    }))
    .filter(u => u.ID && u.NOMBRE);

  const values = cleaned.map(mapUserToRow);

  // Limpiar rango actual
  await clearRange(tokens, USERS_SHEET_ID, 'Hoja 1!A2:D');

  // Escribir nuevos valores
  if (values.length > 0) {
    const range = `Hoja 1!A2:D${cleaned.length + 1}`;
    await updateRange(tokens, USERS_SHEET_ID, range, values);
  }

  console.log(`Usuarios guardados: ${cleaned.length}`);
}

/**
 * Obtener usuario específico por ID
 */
async function getUserById(tokens, userId) {
  const users = await getAllUsers(tokens);
  const user = users.find(u => String(u.ID) === String(userId));

  if (!user) {
    throw new Error(`Usuario ${userId} no encontrado`);
  }
  return user;
}

/**
 * Usuarios por tipo (moto/carro/ambos), solo activos
 */
async function getUsersByType(tokens, tipo) {
  const users = await getAllUsers(tokens);
  const filtered = users.filter(
    u =>
      (u.ACTIVO || '').toUpperCase() === 'SI' &&
      (u.TIPO || '').toLowerCase() === tipo.toLowerCase()
  );

  console.log(`Usuarios de tipo ${tipo}: ${filtered.length}`);
  return filtered;
}

/**
 * NUEVO: Obtener ID por nombre (para usar en reviewReportService)
 */
async function getUserIdByName(tokens, nombreHoja) {
  const users = await getAllUsers(tokens);

  let best = null;
  let bestScore = 0;

  for (const u of users) {
    const score = tokenScore(u.NOMBRE, nombreHoja); 
    if (score > bestScore) {
      bestScore = score;
      best = u;
    }
  }

  if (!best) return null;
  return String(best.ID);
}

module.exports = {
  getAllUsers,
  getPublicUsers,
  saveUsers,
  getUserById,
  getUsersByType,
  getUserIdByName,
};
