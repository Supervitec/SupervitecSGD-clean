import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import'./PreopUsersAdmin.css';

export default function PreopUsersAdmin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/users-preop'); 
      setUsers(res.data.users || []);
    } catch (err) {
      console.error(err);
      setError('Error cargando usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleChange = (index, field, value) => {
    setUsers((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleAdd = () => {
    setUsers((prev) => [
      ...prev,
      { ID: '', NOMBRE: '', TIPO: 'ambos', ACTIVO: 'SI' },
    ]);
  };

  const handleRemove = (index) => {
    setUsers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.post('/users-preop', { users });
      await loadUsers();
      alert('Usuarios guardados correctamente');
    } catch (err) {
      console.error(err);
      alert('Error guardando usuarios');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-review">
      <div className="page-header">
        <h2 className="page-title">Editar usuarios de preoperacional</h2>
        <button
          className="action-btn"
          type="button"
          onClick={handleAdd}
        >
          + Agregar usuario
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="review-table-wrapper">
        <table className="review-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Activo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="empty-cell">
                  No hay usuarios configurados
                </td>
              </tr>
            )}
            {users.map((u, index) => (
              <tr key={`${u.ID}-${index}`}>
                <td>
                  <input
                    value={u.ID || ''}
                    onChange={(e) =>
                      handleChange(index, 'ID', e.target.value)
                    }
                  />
                </td>
                <td>
                  <input
                    value={u.NOMBRE || ''}
                    onChange={(e) =>
                      handleChange(index, 'NOMBRE', e.target.value)
                    }
                  />
                </td>
                <td>
                  <select
                    value={u.TIPO || 'ambos'}
                    onChange={(e) =>
                      handleChange(index, 'TIPO', e.target.value)
                    }
                  >
                    <option value="moto">Moto</option>
                    <option value="carro">Carro</option>
                    <option value="ambos">Ambos</option>
                  </select>
                </td>
                <td>
                  <select
                    value={u.ACTIVO || 'SI'}
                    onChange={(e) =>
                      handleChange(index, 'ACTIVO', e.target.value)
                    }
                  >
                    <option value="SI">SI</option>
                    <option value="NO">NO</option>
                  </select>
                </td>
                <td>
                  <button
                    type="button"
                    className="action-btn small"
                    onClick={() => handleRemove(index)}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '1rem' }}>
        <button
          className="action-btn"
          type="button"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  );
}
