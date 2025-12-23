import { useState, useEffect } from 'react';
import api from '../../../services/api';
import './AdminPreopPanel.css';

export default function AdminPreopPanel() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userHistory, setUserHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate] = useState(new Date());

  const toDateString = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const loadUsersStatus = async () => {
    try {
      setLoading(true);

      // 1) Usuarios configurados en sheet
      const usersResponse = await api.get('/users-preop');
      const usersList = usersResponse.data.users || [];

      // 2) Estado diario calculado en backend
      const today = toDateString(currentDate);
      const recordsResponse = await api.get('/preop/daily-status', {
        params: { date: today },
      });

      const dailyUsers = recordsResponse.data.users || [];
      console.log('📄 Usuarios con estado del día', today, dailyUsers);

      // 3) Construir estado visual por usuario
      const usersWithStatus = await Promise.all(
        usersList.map(async (user) => {
          const record = dailyUsers.find(
            (u) => String(u.userId).trim() === String(user.ID).trim()
          );
          console.log('👤', user.ID, user.NOMBRE, '→ record encontrado:', record);

          const availabilityResponse = await api.get('/preop/check-availability', {
            params: {
              userId: user.ID,
              userName: user.NOMBRE,
            },
          });

          const availability = availabilityResponse.data;

          let status = 'pending';
          let statusText = 'Pendiente';

          if (record) {
            if (record.status === 'completado') {
              status = 'completed';
              statusText = 'Completado';
            } else if (record.status === 'entregado_tarde') {
              status = 'late';
              statusText = 'Entregado tarde';
            }
          } else if (!availability.canFill && availability.reason === 'fuera_de_horario') {
            status = 'missed';
            statusText = 'No entregado';
          } else if (!availability.canFill && availability.reason === 'dia_no_laboral') {
            status = 'non_working';
            statusText = 'Día no laboral';
          }

          return {
            ...user,
            status,
            statusText,
            record,
            deliveryTime: record?.deliveryTime || null,
          };
        })
      );

      setUsers(usersWithStatus);
    } catch (error) {
      console.error('Error cargando estado de usuarios:', error);
      alert('Error al cargar el estado de los usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsersStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUserHistory = async (user) => {
    try {
      setSelectedUser(user);

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const startStr = toDateString(startDate);
      const endStr = toDateString(endDate);

      const response = await api.get('/preop/history', {
        params: {
          userId: user.ID,
          startDate: startStr,
          endDate: endStr,
        },
      });

      const calendarResponse = await api.get('/preop/user-calendar', {
        params: {
          userId: user.ID,
          startDate: startStr,
          endDate: endStr,
        },
      });

      const workingDays = calendarResponse.data.workingDays || [];
      const records = response.data.records || [];

      const history = [];
      const current = new Date(startDate);
      const todayStr = toDateString(new Date());

      while (current <= endDate) {
        const dateString = toDateString(current);
        const record = records.find((r) => r.date === dateString);
        const isWorkingDay = workingDays.includes(dateString);

        let dayStatus = 'no_data';
        let dayStatusText = '-';

        if (!isWorkingDay) {
          dayStatus = 'non_working';
          dayStatusText = 'Día no hábil';
        } else if (record) {
          if (record.status === 'completado') {
            dayStatus = 'completed';
            dayStatusText = 'Completado';
          } else if (record.status === 'entregado_tarde') {
            dayStatus = 'late';
            dayStatusText = 'Tarde';
          } else if (record.status === 'no_entregado') {
            dayStatus = 'missed';
            dayStatusText = 'No entregado';
          }
        } else if (dateString < todayStr) {
          dayStatus = 'missed';
          dayStatusText = 'No entregado';
        }

        history.push({
          date: dateString,
          status: dayStatus,
          statusText: dayStatusText,
          deliveryTime: record?.deliveryTime || null,
        });

        current.setDate(current.getDate() + 1);
      }

      setUserHistory(history.reverse());
    } catch (error) {
      console.error('Error cargando historial:', error);
      alert('Error al cargar el historial del usuario');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      completed: '#28a745',
      pending: '#ffc107',
      late: '#fd7e14',
      missed: '#dc3545',
      non_working: '#6c757d',
      default: '#e0e0e0',
    };
    return colors[status] || colors.default;
  };

  const formatDate = (dateString) => {
    const [y, m, d] = dateString.split('-').map((n) => parseInt(n, 10));
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('es-CO', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    });
  };

  const formatTime = (dateTimeString) => {
    if (!dateTimeString) return '-';
    const date = new Date(dateTimeString);
    return date.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="admin-preop-panel">
        <div className="loading">
          <div className="spinner" />
          <p>Cargando estado de preoperacionales...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-preop-panel">
      <div className="panel-header">
        <h2>Estado de Preoperacionales - {currentDate.toLocaleDateString('es-CO')}</h2>
        <button onClick={loadUsersStatus} className="refresh-btn">
          Actualizar
        </button>
      </div>

      <div className="status-legend">
        <div className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: '#28a745' }}></span>
          <span>Completado</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: '#ffc107' }}></span>
          <span>Pendiente</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: '#fd7e14' }}></span>
          <span>Entregado tarde</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: '#dc3545' }}></span>
          <span>No entregado</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: '#6c757d' }}></span>
          <span>Día no laboral</span>
        </div>
      </div>

      <div className="users-grid">
        {users.map((user) => (
          <div
            key={user.ID}
            className={`user-card ${selectedUser?.ID === user.ID ? 'selected' : ''}`}
            style={{ borderLeftColor: getStatusColor(user.status) }}
            onClick={() => loadUserHistory(user)}
          >
            <div className="user-card-header">
              <h3>{user.NOMBRE}</h3>
              <span
                className="status-badge"
                style={{ backgroundColor: getStatusColor(user.status) }}
              >
                {user.statusText}
              </span>
            </div>
            <div className="user-card-info">
              <p>ID: {user.ID}</p>
              <p>
                Tipo:
                {' '}
                {user.TIPO}
              </p>
              {user.deliveryTime && <p>Hora: {formatTime(user.deliveryTime)}</p>}
            </div>
          </div>
        ))}
      </div>

      {selectedUser && (
        <div className="user-history-panel">
          <div className="history-header">
            <h3>Historial de {selectedUser.NOMBRE} (Últimos 30 días)</h3>
            <button onClick={() => setSelectedUser(null)} className="close-btn">
              ✕
            </button>
          </div>

          <div className="history-table-container">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th>Hora de entrega</th>
                </tr>
              </thead>
              <tbody>
                {userHistory.map((day, idx) => (
                  <tr key={idx}>
                    <td>{formatDate(day.date)}</td>
                    <td>
                      <span
                        className="status-badge-small"
                        style={{ backgroundColor: getStatusColor(day.status) }}
                      >
                        {day.statusText}
                      </span>
                    </td>
                    <td>{formatTime(day.deliveryTime)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
