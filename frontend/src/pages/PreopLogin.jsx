import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './PreopLogin.css';

export default function PreopLogin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const res = await api.get('/users-preop/public');
        setUsers(res.data.users || []);
      } catch (err) {
        console.error('Error cargando usuarios:', err);
        setError('Error cargando la lista de usuarios. Intenta recargar la página.');
      } finally {
        setLoading(false);
      }
    };
    loadUsers();
  }, []);

  const handleSelectUser = (user) => {
    localStorage.setItem('preopUser', JSON.stringify(user));
    navigate('/preop/app');
  };

  if (loading) {
    return (
      <div className="preop-login-container">
        <div className="preop-login-card">
          <h2>Cargando usuarios...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="preop-login-container">
        <div className="preop-login-card">
          <h2>Error</h2>
          <p className="error-message">{error}</p>
          <button 
            className="btn-retry" 
            onClick={() => window.location.reload()}
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="preop-login-container">
      <div className="preop-login-card">
        <h1>Preoperacional Supervitec</h1>
        <p className="subtitle">Selecciona tu nombre para continuar:</p>
        
        {users.length === 0 ? (
          <p className="no-users">No hay usuarios disponibles</p>
        ) : (
          <div className="users-list">
            {users.map((user) => (
              <button
                key={user.id}
                className="user-button"
                onClick={() => handleSelectUser(user)}
              >
                <div className="user-info">
                  <span className="user-id">ID: {user.id}</span>
                  <span className="user-name">{user.nombre}</span>
                  <span className="user-type">{user.tipo}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
