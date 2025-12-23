const { getPublicUsers, getAllUsers, saveUsers } = require('../services/preopUsersService');

const admins = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map(s => s.trim().toLowerCase())
  .filter(Boolean);

function isAdmin(email) {
  return admins.includes((email || '').toLowerCase());
}

// Lista pública (por ejemplo, para el frontend de usuarios)
exports.getPublicList = async (req, res) => {
  console.log('CONTROLADOR ALCANZADO: getPublicList');
  try {
    const tokens = req.session?.tokens; // ajusta al nombre real donde guardas los tokens
    const users = await getPublicUsers(tokens);
    console.log('USUARIOS OBTENIDOS:', users);
    res.json({ success: true, users });
  } catch (err) {
    console.error('Error getPublicList:', err);
    res.status(500).json({ error: 'Error obteniendo usuarios', message: err.message });
  }
};

// Lista completa para admin
exports.getAllForAdmin = async (req, res) => {
  try {
    const sessionUser = req.session?.user;
    if (!sessionUser || !isAdmin(sessionUser.email)) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const tokens = req.session?.tokens;
    const users = await getAllUsers(tokens);
    res.json({ success: true, users });
  } catch (err) {
    console.error('Error getAllForAdmin:', err);
    res.status(500).json({ error: 'Error obteniendo usuarios', message: err.message });
  }
};

// Guardar cambios hechos por el admin
exports.saveAll = async (req, res) => {
  try {
    const sessionUser = req.session?.user;
    if (!sessionUser || !isAdmin(sessionUser.email)) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const { users } = req.body;
    if (!Array.isArray(users)) {
      return res.status(400).json({ error: 'Formato inválido' });
    }

    const tokens = req.session?.tokens;
    await saveUsers(users, tokens);

    res.json({ success: true });
  } catch (err) {
    console.error('Error saveAll:', err);
    res.status(500).json({ error: 'Error guardando usuarios', message: err.message });
  }
};
