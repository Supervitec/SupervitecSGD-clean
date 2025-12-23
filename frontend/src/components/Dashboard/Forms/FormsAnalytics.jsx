import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import api from '../../../services/api';
import './FormsAnalytics.css';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FF6B9D', '#C44569'];

// ==================== TOOLTIP PERSONALIZADO PARA PREGUNTAS ====================
const CustomQuestionTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  const respondents = data.respondents || [];

  return (
    <div className="custom-tooltip">
      <div className="tooltip-header">
        <strong>{data.name}</strong>
      </div>
      <div className="tooltip-body">
        <p className="tooltip-stat">
          <span className="stat-label">Respuestas:</span>
          <span className="stat-value">{data.value} ({data.percentage}%)</span>
        </p>
        
        {respondents.length > 0 && (
          <div className="tooltip-respondents">
            <p className="respondents-title">👥 Respondieron:</p>
            <ul className="respondents-list">
              {respondents.slice(0, 10).map((email, idx) => (
                <li key={idx}>{email}</li>
              ))}
              {respondents.length > 10 && (
                <li className="more-users">+ {respondents.length - 10} más...</li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default function FormsAnalytics({ form, onBack }) {
  const [viewMode, setViewMode] = useState('users');
  const [analytics, setAnalytics] = useState(null);
  const [questionAnalytics, setQuestionAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [exporting, setExporting] = useState(false);
  const [expandedResponses, setExpandedResponses] = useState({});

  const formId = form?.id;

  useEffect(() => {
    if (formId) {
      loadAllData();
    } else {
      setError('ID de formulario no válido');
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Cargar vista por usuarios
      console.log(`📊 Cargando analytics por usuarios: ${formId}`);
      const userRes = await api.get(`/forms/${formId}/analytics`);
      console.log('✅ Analytics por usuarios recibidos:', userRes.data);
      setAnalytics(userRes.data.analytics);

      // Cargar vista por preguntas
      console.log(`📋 Cargando analytics por preguntas: ${formId}`);
      const questionRes = await api.get(`/forms/${formId}/responses-by-question`);
      console.log('✅ Analytics por preguntas recibidos:', questionRes.data);
      setQuestionAnalytics(questionRes.data);
      
    } catch (err) {
      console.error('❌ Error loading analytics:', err);
      setError(err.response?.data?.message || 'Error al cargar análisis');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterByDate = async () => {
    if (!dateRange.start || !dateRange.end) {
      alert('Selecciona ambas fechas');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log(`🔍 Filtrando por fecha: ${dateRange.start} - ${dateRange.end}`);
      const response = await api.get(`/forms/${formId}/responses/date`, {
        params: {
          startDate: dateRange.start,
          endDate: dateRange.end
        }
      });
      
      setAnalytics(response.data.data);
    } catch (err) {
      console.error('Error filtering by date:', err);
      setError('Error al filtrar por fecha');
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilter = () => {
    setDateRange({ start: '', end: '' });
    loadAllData();
  };

  const handleExportCSV = async () => {
    try {
      setExporting(true);
      
      console.log('📥 Exportando CSV...');
      const response = await api.get(`/forms/${formId}/export-csv`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `respuestas-formulario-${formId}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      console.log('✅ CSV exportado correctamente');
      alert('✅ CSV exportado correctamente');
    } catch (err) {
      console.error('❌ Error exportando CSV:', err);
      alert('❌ Error al exportar CSV');
    } finally {
      setExporting(false);
    }
  };

  const toggleResponse = (questionId, index) => {
    const key = `${questionId}-${index}`;
    setExpandedResponses(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // 🔥 FUNCIÓN ACTUALIZADA: Incluye lista de usuarios que respondieron cada opción
  const getChartDataForQuestion = (question) => {
    return question.chartData.map((item, index) => {
      // Obtener lista de usuarios que respondieron esta opción específica
      const respondents = question.responses
        .filter(r => r.answer === item.answer)
        .map(r => r.email);

      return {
        name: item.answer,
        value: item.count,
        percentage: item.percentage,
        respondents: respondents, // 🔥 LISTA DE USUARIOS
        color: COLORS[index % COLORS.length]
      };
    });
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Cargando análisis...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">
          <span>❌</span>
          <div>
            <strong>Error</strong>
            <p>{error}</p>
          </div>
        </div>
        <div className="error-actions">
          <button onClick={loadAllData} className="retry-btn">
            🔄 Reintentar
          </button>
          {onBack && (
            <button onClick={onBack} className="back-btn">
              ← Volver a lista
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!analytics && !questionAnalytics) {
    return (
      <div className="empty-state">
        <p>📊 No hay datos disponibles</p>
        {onBack && (
          <button onClick={onBack} className="back-btn">
            ← Volver a lista
          </button>
        )}
      </div>
    );
  }

  const chartDataUsers = Object.entries(analytics?.userStats || {}).map(([email, stats]) => ({
    name: email,
    value: stats.count
  }));

  return (
    <div className="forms-analytics">
      {/* BOTÓN VOLVER */}
      {onBack && (
        <button onClick={onBack} className="back-button">
          ← Volver a lista
        </button>
      )}

      {/* HEADER */}
      <div className="analytics-header">
        <div>
          <h2>📊 Análisis: {analytics?.formTitle || questionAnalytics?.formTitle || form?.name || 'Formulario'}</h2>
          <p className="form-id">ID: {formId}</p>
        </div>
        <button 
          onClick={handleExportCSV} 
          disabled={exporting || analytics?.totalResponses === 0}
          className="export-csv-button"
        >
          {exporting ? '⏳ Exportando...' : '📥 Exportar CSV'}
        </button>
      </div>

      {/* TOGGLE DE VISTA */}
      <div className="view-toggle">
        <button
          className={`toggle-btn ${viewMode === 'users' ? 'active' : ''}`}
          onClick={() => setViewMode('users')}
        >
          👥 Por Usuarios
        </button>
        <button
          className={`toggle-btn ${viewMode === 'questions' ? 'active' : ''}`}
          onClick={() => setViewMode('questions')}
        >
          📋 Por Preguntas
        </button>
      </div>

      {/* ==================== VISTA POR USUARIOS ==================== */}
      {viewMode === 'users' && analytics && (
        <>
          {/* RESUMEN */}
          <div className="analytics-summary">
            <div className="stat-card">
              <div className="stat-icon">📊</div>
              <div>
                <h3>Total Respuestas</h3>
                <p className="stat-value">{analytics.totalResponses || 0}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">👥</div>
              <div>
                <h3>Usuarios Únicos</h3>
                <p className="stat-value">{Object.keys(analytics.userStats || {}).length}</p>
              </div>
            </div>
          </div>

          {/* FILTRO DE FECHAS */}
          <div className="date-filter">
            <h3>🗓️ Filtrar por fecha</h3>
            <div className="date-inputs">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                placeholder="Fecha inicio"
              />
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                placeholder="Fecha fin"
              />
            </div>
            <div className="filter-buttons">
              <button onClick={handleFilterByDate} className="filter-button">
                Filtrar
              </button>
              <button onClick={handleClearFilter} className="clear-button">
                ✕ Limpiar filtro
              </button>
            </div>
          </div>

          {/* GRÁFICA POR USUARIOS */}
          {chartDataUsers.length > 0 ? (
            <div className="chart-container">
              <h3>Distribución de respuestas por usuario</h3>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={chartDataUsers}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartDataUsers.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="no-data-card">
              <p>📊 No hay usuarios con respuestas registradas.</p>
            </div>
          )}

          {/* TABLA DE USUARIOS */}
          <div className="user-stats-table">
            <h3>Detalle por usuario</h3>
            {Object.keys(analytics.userStats || {}).length === 0 ? (
              <div className="no-data-card">
                <p>📊 No hay respuestas registradas</p>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>USUARIO</th>
                      <th>RESPUESTAS</th>
                      <th>ÚLTIMA RESPUESTA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(analytics.userStats).map(([email, stats]) => (
                      <tr key={email}>
                        <td>{email}</td>
                        <td>{stats.count}</td>
                        <td>
                          {stats.lastResponse 
                            ? new Date(stats.lastResponse).toLocaleString('es-CO', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ==================== VISTA POR PREGUNTAS ==================== */}
      {viewMode === 'questions' && questionAnalytics && (
        <div className="questions-view">
          {questionAnalytics.questions.length === 0 ? (
            <div className="no-data-card">
              <p>📊 No hay preguntas con respuestas para analizar</p>
            </div>
          ) : (
            <div className="questions-list">
              {questionAnalytics.questions.map((question, idx) => (
                <div key={question.questionId} className="question-card">
                  <div className="question-header">
                    <span className="question-number">Pregunta {idx + 1}</span>
                    <h3>{question.title}</h3>
                    <span className="answer-count">
                      {question.totalAnswers} respuestas
                    </span>
                  </div>

                  {question.isMultipleChoice ? (
                    // 📊 GRÁFICA DE PASTEL PARA OPCIÓN MÚLTIPLE
                    <div className="chart-question-container">
                      <div className="chart-wrapper-question">
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={getChartDataForQuestion(question)}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percentage }) => `${name}: ${percentage}%`}
                              outerRadius={100}
                              dataKey="value"
                            >
                              {getChartDataForQuestion(question).map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomQuestionTooltip />} /> {/* 🔥 TOOLTIP PERSONALIZADO */}
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="chart-summary-question">
                        {question.chartData.map((item, i) => (
                          <div key={i} className="chart-item-question">
                            <span className="chart-label-question">{item.answer}</span>
                            <span className="chart-count-question">
                              {item.count} ({item.percentage}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    // 📝 LISTA DESPLEGABLE PARA PREGUNTAS ABIERTAS
                    <div className="responses-list">
                      {question.responses.map((response, i) => {
                        const key = `${question.questionId}-${i}`;
                        const isExpanded = expandedResponses[key];

                        return (
                          <div key={i} className="response-item">
                            <button
                              className="response-toggle"
                              onClick={() => toggleResponse(question.questionId, i)}
                            >
                              <span className="toggle-icon">
                                {isExpanded ? '▼' : '▶'}
                              </span>
                              <span className="response-email">{response.email}</span>
                              <span className="response-date">
                                {new Date(response.timestamp).toLocaleString('es-CO')}
                              </span>
                            </button>
                            {isExpanded && (
                              <div className="response-content">
                                <p>{response.answer}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
