import { useState, useEffect } from 'react';
import api from '../../../services/api';
import './CitationsPanel.css';

export default function CitationsPanel() {
  const [citations, setCitations] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    userId: '',
    userName: '',
    citationDate: '',
    citationTime: '',
    reason: 'sanciones acumuladas',
    reasonDetails: ''
  });

  useEffect(() => {
    loadCitations();
    loadUsers();
  }, []);

  //  CARGAR CITACIONES CON BÚSQUEDA
  const loadCitations = async (search = '') => {
    try {
      setLoading(true);
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      const response = await api.get(`/citations${params}`);
      setCitations(response.data.citations || []);
    } catch (error) {
      console.error('Error cargando citaciones:', error);
      alert('Error al cargar citaciones');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await api.get('/users-preop');
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
    }
  };

  //  MANEJAR BÚSQUEDA
  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    // Buscar después de 500ms de inactividad
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => {
      loadCitations(value);
    }, 500);
  };

  const handleUserSelect = (e) => {
    const userId = e.target.value;
    const user = users.find(u => u.ID === userId);
    
    if (user) {
      setFormData(prev => ({
        ...prev,
        userId: user.ID,
        userName: user.NOMBRE
      }));
    }
  };

  const handleCreateCitation = async (e) => {
    e.preventDefault();

    if (!formData.userId || !formData.citationDate || !formData.citationTime) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    try {
      const citationDateTime = `${formData.citationDate}T${formData.citationTime}:00`;
      
      const response = await api.post('/citations', {
        userId: formData.userId,
        userName: formData.userName,
        citationDate: citationDateTime,
        reason: formData.reason,
        reasonDetails: formData.reasonDetails
      });

      if (response.data.success) {
        alert(' Citación creada exitosamente y agregada al calendario');
        setShowCreateModal(false);
        setFormData({
          userId: '',
          userName: '',
          citationDate: '',
          citationTime: '',
          reason: 'sanciones acumuladas',
          reasonDetails: ''
        });
        loadCitations(searchTerm);
      }
    } catch (error) {
      console.error('Error creando citación:', error);
      alert(error.response?.data?.error || 'Error al crear citación');
    }
  };

  const handleMarkAttendance = async (citationId, status, notes = '') => {
    try {
      const response = await api.patch(`/citations/${citationId}/attendance`, {
        status,
        notes
      });

      if (response.data.success) {
        const message = status === 'se presento' 
          ? ' Usuario marcado como PRESENTE'
          : ' Usuario marcado como AUSENTE';
        
        if (response.data.isUserBlocked) {
          alert(`${message}\n\n🔒 El usuario ha sido BLOQUEADO por acumular 3 ausencias.`);
        } else {
          alert(`${message}\n\nAusencias totales: ${response.data.missedCitations || 0}`);
        }
        
        loadCitations(searchTerm);
      }
    } catch (error) {
      console.error('Error marcando asistencia:', error);
      alert('Error al marcar asistencia');
    }
  };

  const handleUnblockUser = async (userId, userName) => {
    const reason = prompt(`Motivo del desbloqueo de ${userName}:`);
    if (!reason) return;

    try {
      const response = await api.post(`/citations/unblock/${userId}`, { reason });
      
      if (response.data.success) {
        alert(' Usuario desbloqueado exitosamente');
        loadCitations(searchTerm);
      }
    } catch (error) {
      console.error('Error desbloqueando usuario:', error);
      
      if (error.response?.status === 400) {
        alert(` ${error.response.data.error}\n\nAusencias acumuladas: ${error.response.data.missedCitations || 0}`);
      } else {
        alert(error.response?.data?.error || 'Error al desbloquear usuario');
      }
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      programada: { text: 'Programada', color: '#ffc107', icon: '' },
      se_presento: { text: 'Se presentó', color: '#28a745', icon: '' },
      no_se_presento: { text: 'No se presentó', color: '#dc3545', icon: '' },
      cancelada: { text: 'Cancelada', color: '#6c757d', icon: '🚫' }
    };
    const badge = badges[status] || badges.programada;
    return (
      <span 
        className="status-badge"
        style={{ backgroundColor: badge.color }}
      >
        {badge.icon} {badge.text}
      </span>
    );
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredCitations = citations.filter(c => 
    filter === 'all' ? true : c.status === filter
  );

  if (loading) {
    return (
      <div className="citations-panel">
        <div className="loading">
          <div className="spinner"></div>
          <p>Cargando citaciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="citations-panel">
      {/* HEADER */}
      <div className="panel-header">
        <div>
          <h2> Gestión de Citaciones</h2>
          <p className="subtitle">Programa y controla las citaciones de usuarios</p>
        </div>
        <button 
          className="btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
           Nueva Citación
        </button>
      </div>

      {/*  BARRA DE BÚSQUEDA */}
      <div className="search-bar">
        <input
          type="text"
          placeholder=" Buscar por nombre o ID de usuario..."
          value={searchTerm}
          onChange={handleSearch}
          className="search-input"
        />
        {searchTerm && (
          <button 
            className="clear-search"
            onClick={() => {
              setSearchTerm('');
              loadCitations('');
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* FILTERS */}
      <div className="filter-bar">
        <button 
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          Todas ({citations.length})
        </button>
        <button 
          className={filter === 'programada' ? 'active' : ''}
          onClick={() => setFilter('programada')}
        >
           Programadas ({citations.filter(c => c.status === 'programada').length})
        </button>
        <button 
          className={filter === 'se presento' ? 'active' : ''}
          onClick={() => setFilter('se presento')}
        >
           Asistieron ({citations.filter(c => c.status === 'se presento').length})
        </button>
        <button 
          className={filter === 'no se presento' ? 'active' : ''}
          onClick={() => setFilter('no se presento')}
        >
           No asistieron ({citations.filter(c => c.status === 'no se presento').length})
        </button>
      </div>

      {/* LISTA DE CITACIONES */}
      <div className="citations-list">
        {filteredCitations.length === 0 ? (
          <div className="empty-state">
            <p>📭 No hay citaciones {filter !== 'all' ? `con estado: ${filter}` : ''}</p>
            {searchTerm && <p>Intenta con otro término de búsqueda</p>}
          </div>
        ) : (
          filteredCitations.map(citation => (
            <div key={citation._id} className="citation-card">
              <div className="citation-header">
                <div>
                  <h3>{citation.userName}</h3>
                  <p className="citation-id">ID: {citation.userId}</p>
                  {/*  MOSTRAR ESTADO DE BLOQUEO Y AUSENCIAS */}
                  {citation.userIsBlocked && (
                    <span className="blocked-badge">🔒 BLOQUEADO</span>
                  )}
                  {citation.missedCitations > 0 && (
                    <span className="missed-badge">
                       {citation.missedCitations} ausencia{citation.missedCitations > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                {getStatusBadge(citation.status)}
              </div>

              <div className="citation-body">
                <div className="info-row">
                  <span className="label"> Fecha y hora:</span>
                  <span className="value">{formatDateTime(citation.citationDate)}</span>
                </div>

                <div className="info-row">
                  <span className="label">📌 Motivo:</span>
                  <span className="value">
                    {citation.reason === 'sanciones acumuladas' 
                      ? 'Sanciones acumuladas'
                      : citation.reason === 'revision comportamiento'
                      ? 'Revisión de comportamiento'
                      : 'Otro'}
                  </span>
                </div>

                {citation.reasonDetails && (
                  <div className="info-row">
                    <span className="label">💬 Detalles:</span>
                    <span className="value">{citation.reasonDetails}</span>
                  </div>
                )}

                {citation.attendanceNotes && (
                  <div className="info-row">
                    <span className="label"> Notas:</span>
                    <span className="value">{citation.attendanceNotes}</span>
                  </div>
                )}

                {citation.attendanceMarkedBy && (
                  <div className="info-row">
                    <span className="label">👤 Marcado por:</span>
                    <span className="value">
                      {citation.attendanceMarkedBy} el {new Date(citation.attendanceMarkedAt).toLocaleDateString('es-CO')}
                    </span>
                  </div>
                )}
              </div>

              {citation.status === 'programada' && (
                <div className="citation-actions">
                  <button 
                    className="btn-success"
                    onClick={() => {
                      const notes = prompt('Notas de la reunión (opcional):');
                      handleMarkAttendance(citation._id, 'se presento', notes || '');
                    }}
                  >
                     Se presentó
                  </button>
                  <button 
                    className="btn-danger"
                    onClick={() => {
                      if (confirm(`¿Confirmar que ${citation.userName} NO se presentó?\n\nSi acumula 3 ausencias será bloqueado automáticamente.`)) {
                        handleMarkAttendance(citation._id, 'no se presento');
                      }
                    }}
                  >
                     No se presentó
                  </button>
                </div>
              )}

              {/*  MOSTRAR BOTÓN SOLO SI ESTÁ BLOQUEADO */}
              {citation.status === 'no se presento' && citation.userIsBlocked && (
                <div className="citation-actions">
                  <button 
                    className="btn-warning"
                    onClick={() => handleUnblockUser(citation.userId, citation.userName)}
                  >
                    🔓 Desbloquear usuario
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* MODAL CREAR CITACIÓN */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3> Nueva Citación</h3>
              <button 
                className="close-btn"
                onClick={() => setShowCreateModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCitation}>
              <div className="form-group">
                <label>Usuario *</label>
                <select 
                  value={formData.userId}
                  onChange={handleUserSelect}
                  required
                >
                  <option value="">Seleccionar usuario...</option>
                  {users.map(user => (
                    <option key={user.ID} value={user.ID}>
                      {user.NOMBRE} (ID: {user.ID})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Fecha *</label>
                  <input 
                    type="date"
                    value={formData.citationDate}
                    onChange={e => setFormData(prev => ({ ...prev, citationDate: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Hora *</label>
                  <input 
                    type="time"
                    value={formData.citationTime}
                    onChange={e => setFormData(prev => ({ ...prev, citationTime: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Motivo *</label>
                <select 
                  value={formData.reason}
                  onChange={e => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                >
                  <option value="sanciones acumuladas">Sanciones acumuladas</option>
                  <option value="revision comportamiento">Revisión de comportamiento</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              <div className="form-group">
                <label>Detalles adicionales</label>
                <textarea 
                  value={formData.reasonDetails}
                  onChange={e => setFormData(prev => ({ ...prev, reasonDetails: e.target.value }))}
                  rows="3"
                  placeholder="Describe el motivo de la citación..."
                />
              </div>

              <div className="modal-actions">
                <button 
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="btn-primary"
                >
                   Crear Citación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
