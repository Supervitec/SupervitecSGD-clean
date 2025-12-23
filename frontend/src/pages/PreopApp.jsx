import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './PreopApp.css';

export default function PreopApp() {
  const navigate = useNavigate();
  const [preopUser, setPreopUser] = useState(null);
  const [vehicleType, setVehicleType] = useState('');
  const [form, setForm] = useState({
    NOMBRE_CONDUCTOR: '',
    PLACA: '',
    KM: '',
    FRENOS: false,
    LLANTAS: false,
    ESPEJOS: false,
    LUCES: false,
    LIMPIADORES: false,
    NIVEL_ACEITE: false,
    LIQUIDO_FRENOS: false,
    COMBUSTIBLE: '',
    OBSERVACIONES: '',
  });
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('preopUser');
    if (!stored) {
      navigate('/preop');
      return;
    }

    const user = JSON.parse(stored);
    setPreopUser(user);
    
    setForm((prev) => ({
      ...prev,
      NOMBRE_CONDUCTOR: user.nombre,
    }));
  }, [navigate]);

  const handleVehicleType = (type) => {
    setVehicleType(type);
    setMessage('');
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!vehicleType) {
      setMessage(' Por favor selecciona tipo de vehículo (Moto o Carro)');
      return;
    }
    
    if (!form.PLACA.trim()) {
      setMessage(' Por favor ingresa la placa del vehículo');
      return;
    }

    try {
      setSending(true);
      setMessage('');

      const payload = {
        ...form,
        TIPO: vehicleType,
        FECHA: new Date().toISOString().split('T')[0],
        HORA_ENVIO: new Date().toLocaleTimeString('es-CO', { hour12: false }),
        ID_USUARIO: preopUser.id,
      };

      const res = await api.post(`/preop/submit/${vehicleType}`, payload);

      if (res.data.success) {
        setMessage(' Preoperacional guardado correctamente');
        
        setTimeout(() => {
          setForm({
            NOMBRE_CONDUCTOR: preopUser.nombre,
            PLACA: '',
            KM: '',
            FRENOS: false,
            LLANTAS: false,
            ESPEJOS: false,
            LUCES: false,
            LIMPIADORES: false,
            NIVEL_ACEITE: false,
            LIQUIDO_FRENOS: false,
            COMBUSTIBLE: '',
            OBSERVACIONES: '',
          });
          setVehicleType('');
          setMessage('');
        }, 2000);
      }
    } catch (error) {
      console.error('Error enviando preoperacional:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Error al enviar';
      setMessage(` ${errorMsg}`);
    } finally {
      setSending(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('preopUser');
    navigate('/preop');
  };

  if (!preopUser) {
    return (
      <div className="preop-app-container">
        <p>Redirigiendo...</p>
      </div>
    );
  }

  return (
    <div className="preop-app-container">
      <div className="preop-header">
        <div className="header-content">
          <h1>Formulario Preoperacional</h1>
          <div className="user-badge">
            <span className="badge-label">Conductor:</span>
            <span className="badge-name">{preopUser.nombre}</span>
          </div>
        </div>
        <button className="btn-logout" onClick={handleLogout}>
          Cambiar Usuario
        </button>
      </div>

      <div className="preop-form-card">
        <form onSubmit={handleSubmit}>
          
          {/* Selección de tipo de vehículo */}
          <div className="section-header">
            <h2>Tipo de Vehículo</h2>
          </div>
          <div className="vehicle-type-selector">
            <button
              type="button"
              className={`vehicle-btn ${vehicleType === 'moto' ? 'active' : ''}`}
              onClick={() => handleVehicleType('moto')}
            >
            Moto
            </button>
            <button
              type="button"
              className={`vehicle-btn ${vehicleType === 'carro' ? 'active' : ''}`}
              onClick={() => handleVehicleType('carro')}
            >
            Carro
            </button>
          </div>

          {/* Información del vehículo */}
          <div className="section-header">
            <h2>Información del Vehículo</h2>
          </div>
          <div className="form-grid">
            <div className="form-field">
              <label>Placa *</label>
              <input
                type="text"
                name="PLACA"
                value={form.PLACA}
                onChange={handleChange}
                placeholder="ABC123"
                required
              />
            </div>
            <div className="form-field">
              <label>Kilometraje</label>
              <input
                type="number"
                name="KM"
                value={form.KM}
                onChange={handleChange}
                placeholder="12345"
              />
            </div>
            <div className="form-field">
              <label>Nivel Combustible</label>
              <select name="COMBUSTIBLE" value={form.COMBUSTIBLE} onChange={handleChange}>
                <option value="">Seleccionar</option>
                <option value="LLENO">Lleno</option>
                <option value="3/4">3/4</option>
                <option value="1/2">1/2</option>
                <option value="1/4">1/4</option>
                <option value="VACIO">Vacío</option>
              </select>
            </div>
          </div>

          {/* Checklist de revisión */}
          <div className="section-header">
            <h2>Checklist de Revisión</h2>
          </div>
          <div className="checklist">
            <label className="checkbox-item">
              <input
                type="checkbox"
                name="FRENOS"
                checked={form.FRENOS}
                onChange={handleChange}
              />
              <span>Frenos OK</span>
            </label>
            <label className="checkbox-item">
              <input
                type="checkbox"
                name="LLANTAS"
                checked={form.LLANTAS}
                onChange={handleChange}
              />
              <span>Llantas OK</span>
            </label>
            <label className="checkbox-item">
              <input
                type="checkbox"
                name="ESPEJOS"
                checked={form.ESPEJOS}
                onChange={handleChange}
              />
              <span>Espejos OK</span>
            </label>
            <label className="checkbox-item">
              <input
                type="checkbox"
                name="LUCES"
                checked={form.LUCES}
                onChange={handleChange}
              />
              <span>Luces OK</span>
            </label>
            <label className="checkbox-item">
              <input
                type="checkbox"
                name="LIMPIADORES"
                checked={form.LIMPIADORES}
                onChange={handleChange}
              />
              <span>Limpiadores OK</span>
            </label>
            {vehicleType === 'carro' && (
              <>
                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    name="NIVEL_ACEITE"
                    checked={form.NIVEL_ACEITE}
                    onChange={handleChange}
                  />
                  <span>Nivel Aceite OK</span>
                </label>
                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    name="LIQUIDO_FRENOS"
                    checked={form.LIQUIDO_FRENOS}
                    onChange={handleChange}
                  />
                  <span>Líquido Frenos OK</span>
                </label>
              </>
            )}
          </div>

          {/* Observaciones */}
          <div className="section-header">
            <h2>Observaciones</h2>
          </div>
          <div className="form-field">
            <textarea
              name="OBSERVACIONES"
              value={form.OBSERVACIONES}
              onChange={handleChange}
              rows="4"
              placeholder="Describe cualquier novedad o problema detectado..."
            />
          </div>

          {/* Mensaje de estado */}
          {message && (
            <div className={`message ${message.includes('') ? 'success' : 'error'}`}>
              {message}
            </div>
          )}

          {/* Botón de envío */}
          <button
            type="submit"
            className="btn-submit"
            disabled={sending || !vehicleType}
          >
            {sending ? 'Enviando...' : 'Enviar Preoperacional'}
          </button>
        </form>
      </div>
    </div>
  );
}
