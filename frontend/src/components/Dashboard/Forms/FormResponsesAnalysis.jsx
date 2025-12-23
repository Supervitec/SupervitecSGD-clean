import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import api from '../../../services/api';
import './FormResponsesAnalysis.css';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function FormResponsesAnalysis() {
  const { formId } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [expandedResponses, setExpandedResponses] = useState({});

  useEffect(() => {
    loadAnalysis();
  }, [formId]);

  const loadAnalysis = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/forms/${formId}/responses-by-question`);
      if (res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Error cargando análisis:', err);
      alert('Error cargando respuestas');
    } finally {
      setLoading(false);
    }
  };

  const toggleResponse = (questionId, index) => {
    const key = `${questionId}-${index}`;
    setExpandedResponses(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const getChartData = (chartData) => {
    const colors = [
      '#4CAF50', '#2196F3', '#FF9800', '#F44336',
      '#9C27B0', '#00BCD4', '#FFEB3B', '#795548',
    ];

    return {
      labels: chartData.map(d => `${d.answer} (${d.percentage}%)`),
      datasets: [
        {
          data: chartData.map(d => d.count),
          backgroundColor: colors.slice(0, chartData.length),
          borderWidth: 2,
          borderColor: '#fff',
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 15,
          font: { size: 12 },
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            return `${label}: ${value} respuestas`;
          },
        },
      },
    },
  };

  if (loading) {
    return (
      <div className="analysis-loading">
        <div className="spinner"></div>
        <p>Cargando análisis...</p>
      </div>
    );
  }

  if (!data || data.questions.length === 0) {
    return (
      <div className="analysis-empty">
        <p>📊 No hay respuestas para analizar</p>
      </div>
    );
  }

  return (
    <div className="form-analysis-container">
      <div className="analysis-header">
        <h1>📊 Análisis de Respuestas</h1>
        <h2>{data.formTitle}</h2>
        <p className="response-count">
          Total de respuestas: <strong>{data.totalResponses}</strong>
        </p>
      </div>

      <div className="questions-analysis">
        {data.questions.map((question, idx) => (
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
              <div className="chart-container">
                <div className="chart-wrapper">
                  <Pie data={getChartData(question.chartData)} options={chartOptions} />
                </div>
                <div className="chart-summary">
                  {question.chartData.map((item, i) => (
                    <div key={i} className="chart-item">
                      <span className="chart-label">{item.answer}</span>
                      <span className="chart-count">
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
    </div>
  );
}
