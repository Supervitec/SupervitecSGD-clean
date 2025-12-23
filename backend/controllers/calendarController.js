const WorkCalendar = require('../models/WorkCalendar');
const { syncUserMonthReview } = require('../services/reviewSyncService');

/**
 * Guardar o actualizar calendario laboral de un usuario
 * POST /api/calendar/save
 */
exports.saveCalendar = async (req, res) => {
  try {
    const tokens = req.session.tokens;
    const { userId, userName, year, month, nonWorkingDays } = req.body;

    console.log(' Guardando calendario:', { userId, userName, year, month });

    if (!userId || !year || !month) {
      return res.status(400).json({
        error: 'Faltan parámetros requeridos',
        message: 'Se requieren userId, year y month'
      });
    }

    let calendar = await WorkCalendar.findOne({ userId, year, month });

    if (calendar) {
      calendar.nonWorkingDays = nonWorkingDays || [];
      calendar.userName = userName;
      await calendar.save();
      console.log(' Calendario actualizado');
    } else {
      calendar = new WorkCalendar({
        userId,
        userName,
        year,
        month,
        nonWorkingDays: nonWorkingDays || []
      });
      await calendar.save();
      console.log(' Calendario creado');
    }

    console.log(' Sincronizando informe de revisión...');
    try {
      if (tokens) {
        await syncUserMonthReview(tokens, userId, userName, year, month);
        console.log(' Informe de revisión sincronizado automáticamente');
      } else {
        console.log(' No hay tokens disponibles, sincronización omitida');
      }
    } catch (syncError) {
      console.error(' Error sincronizando informe:', syncError.message);
    }

    res.json({
      success: true,
      message: 'Calendario guardado y informe sincronizado',
      calendar
    });

  } catch (error) {
    console.error(' Error guardando calendario:', error);
    res.status(500).json({
      error: 'Error guardando calendario',
      message: error.message
    });
  }
};

/**
 * Obtener calendario de un usuario
 * GET /api/calendar?userId=xxx&year=2025&month=12
 */
exports.getCalendar = async (req, res) => {
  try {
    const { userId, year, month } = req.query;

    if (!userId || !year || !month) {
      return res.status(400).json({
        error: 'Faltan parámetros',
        message: 'Se requieren userId, year y month'
      });
    }

    const calendar = await WorkCalendar.findOne({
      userId,
      year: parseInt(year),
      month: parseInt(month)
    });

    if (!calendar) {
      return res.json({
        success: true,
        calendar: null,
        message: 'No hay calendario configurado'
      });
    }

    res.json({
      success: true,
      calendar
    });

  } catch (error) {
    console.error(' Error obteniendo calendario:', error);
    res.status(500).json({
      error: 'Error obteniendo calendario',
      message: error.message
    });
  }
};


/**
 * Obtener calendarios de todos los usuarios para un mes
 * GET /api/calendar/month?year=2025&month=12
 */
exports.getMonthCalendars = async (req, res) => {
  try {
    const { year, month } = req.query;

    if (!year || !month) {
      return res.status(400).json({
        error: 'Se requieren year y month'
      });
    }

    const calendars = await WorkCalendar.find({
      year: parseInt(year),
      month: parseInt(month)
    });

    res.json({
      success: true,
      count: calendars.length,
      calendars
    });

  } catch (error) {
    console.error(' Error obteniendo calendarios:', error);
    res.status(500).json({
      error: 'Error obteniendo calendarios',
      message: error.message
    });
  }
};

module.exports = {
  saveCalendar,
  getCalendar,
  getMonthCalendars
};
