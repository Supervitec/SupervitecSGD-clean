import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './PublicPreopSelector.css';

export default function PublicPreopSelector() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [vehicleType, setVehicleType] = useState('');
  const [loading, setLoading] = useState(true);
  const [availability, setAvailability] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      checkAvailability();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUser]); 

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users-preop');
      
      const activeUsers = response.data.users
        .filter(user => user.ACTIVO === 'SI')
        .sort((a, b) => a.NOMBRE.localeCompare(b.NOMBRE));
      
      setUsers(activeUsers);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      alert('Error al cargar la lista de usuarios');
    } finally {
      setLoading(false);
    }
  };

  const checkAvailability = async () => {
    if (!selectedUser) return;

    try {
      const response = await api.get('/preop/check-availability', {
        params: {
          userId: selectedUser.ID,
          userName: selectedUser.NOMBRE
        }
      });

      setAvailability(response.data);
    } catch (error) {
      console.error('Error verificando disponibilidad:', error);
    }
  };

  const handleContinue = () => {
    if (!selectedUser || !vehicleType) {
      alert(' Por favor selecciona tu nombre y tipo de vehículo');
      return;
    }

    if (!availability?.canFill) {
      alert(` ${availability?.message || 'No puedes llenar el preoperacional en este momento'}`);
      return;
    }

    navigate(`/preop-form/${vehicleType}`, {
      state: {
        userId: selectedUser.ID,
        userName: selectedUser.NOMBRE,
        vehicleType
      }
    });
  };

  const getAvailabilityColor = () => {
    if (!availability) return 'gray';
    if (availability.reason === 'dia_no_laboral') return 'blue';
    if (availability.reason === 'ya_completado') return 'green';
    if (availability.canFill && availability.timeWindow === 'normal') return 'green';
    if (availability.canFill && availability.timeWindow === 'late') return 'orange';
    if (availability.reason === 'fuera_de_horario') return 'red';
    return 'gray';
  };

  if (loading) {
    return (
      <div className="public-preop-container">
        <div className="loading">
          <div className="spinner" />
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="public-preop-container">
      <div className="preop-card">
        <div className="preop-header">
          <h1> Preoperacional Supervitec</h1>
          <p className="subtitle">Selecciona tu nombre y tipo de vehículo</p>
        </div>

        <div className="form-section">
          {/* Selector de Usuario */}
          <div className="form-group">
            <label htmlFor="user-select">
              <span className="label-icon">👤</span>
              Selecciona tu nombre:
            </label>
            <select
              id="user-select"
              value={selectedUser?.ID || ''}
              onChange={(e) => {
                const user = users.find(u => u.ID === e.target.value);
                setSelectedUser(user);
                setVehicleType(user?.TIPO || '');
              }}
              className="select-input"
            >
              <option value="">-- Selecciona tu nombre --</option>
              {users.map(user => (
                <option key={user.ID} value={user.ID}>
                  {user.NOMBRE}
                </option>
              ))}
            </select>
          </div>

          {/* Selector de Vehículo */}
          {selectedUser && (
            <div className="form-group">
              <label htmlFor="vehicle-type">
                <span className="label-icon"></span>
                Tipo de vehículo:
              </label>
              <select
                id="vehicle-type"
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                className="select-input"
              >
                <option value="">-- Selecciona tipo --</option>
                <option value="moto"> Moto</option>
                <option value="carro"> Carro</option>
              </select>
            </div>
          )}

          {/* Mensaje de disponibilidad */}
          {availability && selectedUser && (
            <div className={`availability-message ${getAvailabilityColor()}`}>
              <div className="message-icon">
                {availability.canFill ? '' : ''}
              </div>
              <div className="message-content">
                <p className="message-text">{availability.message}</p>
                {availability.warning && (
                  <p className="warning-text"> Se registrará como entrega tardía</p>
                )}
                {availability.deadline && (
                  <p className="deadline-text">
                    Límite: {availability.deadline}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Botón continuar */}
          <button
            type="button"
            onClick={handleContinue}
            disabled={!selectedUser || !vehicleType || !availability?.canFill}
            className="continue-btn"
          >
            Continuar al Formulario →
          </button>
        </div>

        <div className="preop-footer">
          <p className="info-text">
             Horario: Llena tu preoperacional antes de las 9:00 AM
          </p>
          <p className="info-text">
            🔴 Ventana de recuperación: 9:00 AM - 12:00 PM (con sanción)
          </p>
        </div>
      </div>
    </div>
  );
}
