import { useState, useEffect } from 'react';
import api from '../../../services/api';
import './WorkCalendarPanel.css';

export default function WorkCalendarPanel() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [nonWorkingDays, setNonWorkingDays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (selectedUser && selectedUser.ID) {
      loadUserCalendar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUser, year, month]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users-preop');
      
      console.log(' Usuarios cargados:', response.data);
      
      const usersList = response.data.users || [];
      setUsers(usersList);
      
      if (usersList.length > 0) {
        console.log(' Seleccionando primer usuario:', usersList[0]);
        setSelectedUser(usersList[0]);
      }
    } catch (error) {
      console.error(' Error cargando usuarios:', error);
      alert(' Error al cargar la lista de usuarios');
    } finally {
      setLoading(false);
    }
  };

  const loadUserCalendar = async () => {
    if (!selectedUser || !selectedUser.ID) {
      console.log(' No hay usuario seleccionado');
      return;
    }
    
    try {
      setLoading(true);
      
      console.log(' Cargando calendario para:', {
        userId: selectedUser.ID,
        userName: selectedUser.NOMBRE,
        year,
        month
      });
      
      const response = await api.get('/calendar/user', {
        params: {
          userId: selectedUser.ID,
          userName: selectedUser.NOMBRE,
          year,
          month
        }
      });

      console.log(' Calendario cargado:', response.data);
      setNonWorkingDays(response.data.calendar.nonWorkingDays || []);
    } catch (error) {
      console.error(' Error cargando calendario:', error);
      alert(' Error al cargar el calendario');
    } finally {
      setLoading(false);
    }
  };

  const saveCalendar = async () => {
    if (!selectedUser) {
      alert(' Selecciona un usuario primero');
      return;
    }

    try {
      setSaving(true);
      
      console.log(' Guardando calendario...');
      
      const response = await api.post('/calendar/update', {
        userId: selectedUser.ID,
        userName: selectedUser.NOMBRE,
        year,
        month,
        nonWorkingDays
      });

      console.log(' Respuesta del servidor:', response.data);

      alert(` ${response.data.message || 'Calendario actualizado e informe sincronizado correctamente'}`);
      
      console.log('🎯 Calendario guardado y sincronizado exitosamente');
      
    } catch (error) {
      console.error(' Error guardando calendario:', error);
      alert(' Error al guardar el calendario');
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (dateString) => {
    if (nonWorkingDays.includes(dateString)) {
      setNonWorkingDays(nonWorkingDays.filter(d => d !== dateString));
    } else {
      setNonWorkingDays([...nonWorkingDays, dateString]);
    }
  };

  const getDaysInMonth = () => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const days = [];

    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month - 1, day);
      const dateString = date.toISOString().split('T')[0];
      const isSunday = date.getDay() === 0;
      const isNonWorking = nonWorkingDays.includes(dateString);

      days.push({
        day,
        date: dateString,
        isSunday,
        isNonWorking
      });
    }

    return days;
  };

  const previousMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month, 1));
  };

  const getMonthName = () => {
    return currentDate.toLocaleDateString('es-CO', {
      month: 'long',
      year: 'numeric'
    });
  };

  if (loading && users.length === 0) {
    return (
      <div className="calendar-panel">
        <div className="loading">
          <div className="spinner" />
          <p>Cargando usuarios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="calendar-panel">
      <div className="calendar-header">
        <h2> Calendario Laboral</h2>
        <p className="calendar-subtitle">
          Gestiona los días laborales y no laborales de cada usuario. 
          Al guardar se sincroniza automáticamente el informe de revisión.
        </p>
      </div>

      <div className="user-selector">
        <label htmlFor="user-select">Usuario:</label>
        <select
          id="user-select"
          value={selectedUser?.ID || ''}
          onChange={(e) => {
            const user = users.find(u => u.ID === e.target.value);
            console.log('👤 Usuario seleccionado:', user);
            setSelectedUser(user);
          }}
          className="user-select"
          disabled={loading}
        >
          {users.length === 0 && (
            <option value="">No hay usuarios disponibles</option>
          )}
          {users.map(user => (
            <option key={user.ID} value={user.ID}>
              {user.NOMBRE}
            </option>
          ))}
        </select>
      </div>

      <div className="month-navigation">
        <button
          type="button"
          onClick={previousMonth}
          className="nav-btn"
          disabled={loading}
        >
          ← Mes anterior
        </button>
        <h3 className="current-month">{getMonthName()}</h3>
        <button
          type="button"
          onClick={nextMonth}
          className="nav-btn"
          disabled={loading}
        >
          Mes siguiente →
        </button>
      </div>

      <div className="calendar-legend">
        <div className="legend-item">
          <span className="legend-color working"></span>
          <span>Día laboral</span>
        </div>
        <div className="legend-item">
          <span className="legend-color sunday"></span>
          <span>Domingo (automático)</span>
        </div>
        <div className="legend-item">
          <span className="legend-color non-working"></span>
          <span>Día no laboral</span>
        </div>
      </div>

      <div className="calendar-grid-container">
        <div className="calendar-weekdays">
          <div className="weekday">Dom</div>
          <div className="weekday">Lun</div>
          <div className="weekday">Mar</div>
          <div className="weekday">Mié</div>
          <div className="weekday">Jue</div>
          <div className="weekday">Vie</div>
          <div className="weekday">Sáb</div>
        </div>

        <div className="calendar-grid">
          {getDaysInMonth().map((dayInfo, index) => (
            <div
              key={index}
              className={`calendar-day ${
                !dayInfo
                  ? 'empty'
                  : dayInfo.isSunday
                  ? 'sunday'
                  : dayInfo.isNonWorking
                  ? 'non-working'
                  : 'working'
              }`}
              onClick={() => {
                if (dayInfo && !dayInfo.isSunday) {
                  toggleDay(dayInfo.date);
                }
              }}
            >
              {dayInfo ? dayInfo.day : ''}
            </div>
          ))}
        </div>
      </div>

      <div className="calendar-actions">
        <button
          type="button"
          onClick={saveCalendar}
          disabled={saving || loading || !selectedUser}
          className="save-btn"
        >
          {saving ? ' Guardando y sincronizando...' : ' Guardar Calendario'}
        </button>
      </div>

      {/*  INDICADOR DE SINCRONIZACIÓN */}
      {saving && (
        <div className="sync-indicator">
          <div className="spinner-small"></div>
          <p>Guardando calendario y sincronizando informe de revisión...</p>
        </div>
      )}
    </div>
  );
}
