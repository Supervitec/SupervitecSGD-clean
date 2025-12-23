import { useEffect, useState } from 'react';
import api from '../../services/api';
import './AdminReviewPage.css';

export default function AdminReviewPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [meses, setMeses] = useState([]);
  const [mesSeleccionado, setMesSeleccionado] = useState('');
  const [conductores, setConductores] = useState([]);
  const [editando, setEditando] = useState(null);
  const [valorEdit, setValorEdit] = useState('');

  useEffect(() => {
    cargarMeses();
  }, []);

  useEffect(() => {
    if (mesSeleccionado) {
      loadDataByMonth();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesSeleccionado]);

  const cargarMeses = async () => {
    try {
      const res = await api.get('/review/months');
      if (res.data.success) {
        setMeses(res.data.meses);
        if (res.data.meses.length > 0) {
          setMesSeleccionado(res.data.meses[0]);
        }
      }
    } catch (err) {
      console.error('Error cargando meses:', err);
      setError('Error cargando lista de meses');
    }
  };

  const loadDataByMonth = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/review?month=${mesSeleccionado}`);
      if (res.data.success) {
        setConductores(res.data.conductores || []);
      }
    } catch (err) {
      console.error('Error cargando conductores:', err);
      setError('Error cargando datos del mes');
    } finally {
      setLoading(false);
    }
  };

  const citarConductor = async (conductor) => {
    if (!window.confirm(`¿Enviar citación a ${conductor.nombre}?`)) return;
    
    try {
      const res = await api.post('/review/citar-automatico', { conductor });
      if (res.data.success) {
        alert(` Citación enviada a ${conductor.nombre}`);
        // Recargar datos después de citar
        await loadDataByMonth();
      } else {
        alert(` Error: ${res.data.error}`);
      }
    } catch (err) {
      console.error('Error citando:', err);
      alert(' Error enviando citación');
    }
  };

  const citarTodosAutomatico = async () => {
  const conductoresACitar = conductores.filter(c => c.requiereCitacion);
  if (conductoresACitar.length === 0) {
    alert('ℹ️ No hay conductores que requieran citación');
    return;
  }
  
  if (!window.confirm(`¿Enviar citación a ${conductoresACitar.length} conductor(es)?`)) {
    return;
  }

  setLoading(true);

  try {
    // Enviar todas las citaciones en paralelo
    const promesas = conductoresACitar.map(conductor =>
      api.post('/review/citar-automatico', { conductor })
        .then(() => ({ success: true, conductor: conductor.nombre }))
        .catch(err => ({ 
          success: false, 
          conductor: conductor.nombre, 
          error: err.response?.data?.error || 'Error desconocido' 
        }))
    );

    const resultados = await Promise.all(promesas);
    
    const exitosos = resultados.filter(r => r.success).length;
    const errores = resultados.filter(r => !r.success);

    let mensaje = `✅ Citaciones enviadas: ${exitosos}/${conductoresACitar.length}`;
    
    if (errores.length > 0) {
      mensaje += `\n\n❌ Errores (${errores.length}):\n`;
      errores.forEach(e => {
        mensaje += `• ${e.conductor}: ${e.error}\n`;
      });
    }

    alert(mensaje);
    
    // Recargar datos
    await loadDataByMonth();
  } catch (err) {
    console.error('Error citando:', err);
    alert('❌ Error enviando citaciones');
  } finally {
    setLoading(false);
  }
};


  const enviarAlertaAdmin = async () => {
    const conductoresConTardanzas = conductores.filter(c => c.totalTardanzas > 0);
    
    if (conductoresConTardanzas.length === 0) {
      alert('ℹ️ No hay conductores con tardanzas');
      return;
    }

    try {
      const res = await api.post('/review/enviar-alerta-admin', {
        conductoresConTardanzas,
        mes: mesSeleccionado,
      });
      
      if (res.data.success) {
        alert(` Alerta enviada (${res.data.alertasEnviadas} destinatario(s))`);
      } else {
        alert(' Error enviando alerta');
      }
    } catch (err) {
      console.error('Error enviando alerta:', err);
      alert(' Error enviando alerta');
    }
  };

  const iniciarEdicion = (conductor) => {
    setEditando(conductor);
    setValorEdit(conductor.observacion || '');
  };

  const guardarEdicion = async () => {
    if (!editando) return;

    try {
      const res = await api.put('/review/observacion', {
        mes: mesSeleccionado,
        fila: editando.row,
        valor: valorEdit,
      });

      if (res.data.success) {
        const nuevos = conductores.map(c =>
          c.row === editando.row ? { ...c, observacion: valorEdit } : c
        );
        setConductores(nuevos);
        setEditando(null);
        alert(' Observación actualizada');
      } else {
        alert(' Error al guardar');
      }
    } catch (err) {
      console.error('Error guardando:', err);
      alert(' Error al guardar');
    }
  };

  return (
    <div className="admin-review-page">
      <div className="review-header">
        <h1> Informe de Revisión</h1>
        <p>Revisa cumplimiento de preoperacionales</p>
      </div>

      {/* Filtros por mes */}
      <div className="review-filters">
        <div className="filter-group">
          <label>Mes/Año:</label>
          <select
            value={mesSeleccionado}
            onChange={(e) => setMesSeleccionado(e.target.value)}
          >
            {meses.map(mes => (
              <option key={mes} value={mes}>{mes}</option>
            ))}
          </select>
        </div>
        <button className="btn-filter" onClick={loadDataByMonth} disabled={loading}>
          {loading ? ' Cargando...' : ' Actualizar'}
        </button>
        <button className="btn-filter btn-alerta" onClick={enviarAlertaAdmin}>
           Alerta Admins
        </button>
        <button className="btn-filter btn-citar-todos" onClick={citarTodosAutomatico}>
          Citar Todos
        </button>
      </div>

      {/* Estadísticas */}
      {conductores.length > 0 && (
        <div className="review-stats">
          <div className="stat-card">
            <span className="stat-label">Total Conductores</span>
            <span className="stat-value">{conductores.length}</span>
          </div>
          <div className="stat-card stat-warning">
            <span className="stat-label">Con Tardanzas</span>
            <span className="stat-value">
              {conductores.filter(c => c.totalTardanzas > 0).length}
            </span>
          </div>
          <div className="stat-card stat-danger">
            <span className="stat-label">Requieren Citación (≥3)</span>
            <span className="stat-value">
              {conductores.filter(c => c.requiereCitacion).length}
            </span>
          </div>
        </div>
      )}

      {error && <div className="review-error">{error}</div>}

      {/* Tabla de conductores */}
      {!loading && conductores.length > 0 && (
        <div className="review-table-container">
          <table className="review-table">
            <thead>
              <tr>
                <th>Conductor</th>
                <th>Días Registrados</th>
                <th>Días Faltantes</th>
                <th>Tardanzas (&gt;9AM)</th>
                <th>Observación</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {conductores.map((conductor, idx) => (
                <tr key={idx} className={conductor.requiereCitacion ? 'row-danger' : ''}>
                  <td>
                    <strong>{conductor.nombre}</strong>
                    {conductor.correo && (
                      <div className="text-small">{conductor.correo}</div>
                    )}
                  </td>

                  <td>{conductor.diasRegistrados || '-'}</td>
                  <td className={conductor.diasQueFaltan ? 'text-warning' : ''}>
                    {conductor.diasQueFaltan || '-'}
                  </td>
                  <td>
                    {conductor.totalTardanzas > 0 ? (
                      <div>
                        <span
                          className={`badge-status ${
                            conductor.requiereCitacion ? 'no' : 'warning'
                          }`}
                        >
                          {conductor.totalTardanzas}
                        </span>
                        {conductor.tardanzas && (
                          <div className="text-small">
                            {conductor.tardanzas.map((t, i) => (
                              <div key={i}>
                                {t.fecha} - {t.hora}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="badge-status yes">0</span>
                    )}
                  </td>

                  {/* Observación editable */}
                  <td>
                    {editando?.row === conductor.row ? (
                      <div>
                        <textarea
                          value={valorEdit}
                          onChange={(e) => setValorEdit(e.target.value)}
                          rows={3}
                          style={{ width: '100%', padding: '0.5rem', borderRadius: '4px' }}
                        />
                        <div
                          style={{
                            marginTop: '0.5rem',
                            display: 'flex',
                            gap: '0.5rem',
                          }}
                        >
                          <button className="btn-citate" onClick={guardarEdicion}>
                            💾 Guardar
                          </button>
                          <button
                            className="btn-filter"
                            onClick={() => setEditando(null)}
                          >
                             Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span>{conductor.observacion || '-'}</span>
                        <button
                          className="btn-edit"
                          onClick={() => iniciarEdicion(conductor)}
                        >
                          ✏️
                        </button>
                      </div>
                    )}
                  </td>

                  {/* Acciones */}
                  <td>
                    {conductor.requiereCitacion && (
                      <button
                        className="btn-citate"
                        onClick={() => citarConductor(conductor)}
                      >
                        Citar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && conductores.length === 0 && mesSeleccionado && (
        <div className="review-empty">
          <p>ℹ️ No hay datos para este mes</p>
        </div>
      )}
    </div>
  );
}
