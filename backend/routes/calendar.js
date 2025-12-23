const express = require('express');
const router = express.Router();
const WorkCalendar = require('../models/WorkCalendar');
const { syncUserMonthReview } = require('../services/reviewSyncService'); 

/**
 * Obtener calendario de un usuario
 * GET /api/calendar/user
 */
router.get('/user', async (req, res) => {
  try {
    const { userId, userName, year, month } = req.query;

    console.log(' GET /api/calendar/user - Params:', { userId, userName, year, month });

    if (!userId) {
      console.log(' userId no proporcionado');
      return res.status(400).json({
        error: 'userId es requerido'
      });
    }

    let calendar = await WorkCalendar.findOne({
      userId,
      year: parseInt(year),
      month: parseInt(month)
    });

    if (!calendar) {
      console.log(' Creando nuevo calendario para:', userId);
      calendar = new WorkCalendar({
        userId,
        userName: userName || userId,
        year: parseInt(year),
        month: parseInt(month),
        nonWorkingDays: []
      });
      await calendar.save();
    }

    console.log(' Calendario obtenido:', calendar._id);

    res.json({
      success: true,
      calendar
    });

  } catch (error) {
    console.error(' Error obteniendo calendario:', error);
    res.status(500).json({
      error: 'Error al obtener calendario',
      message: error.message
    });
  }
});

/**
 * Actualizar calendario de un usuario
 * POST /api/calendar/update
 */
router.post('/update', async (req, res) => {
  try {
    const tokens = req.session?.tokens; 
    const { userId, userName, year, month, nonWorkingDays } = req.body;

    console.log(' POST /api/calendar/update - Body:', { userId, userName, year, month, nonWorkingDays });

    if (!userId || !year || !month) {
      return res.status(400).json({
        error: 'userId, year y month son requeridos'
      });
    }

    let calendar = await WorkCalendar.findOne({
      userId,
      year: parseInt(year),
      month: parseInt(month)
    });

    if (calendar) {
      calendar.nonWorkingDays = nonWorkingDays || [];
      calendar.userName = userName || calendar.userName;
    } else {
      calendar = new WorkCalendar({
        userId,
        userName: userName || userId,
        year: parseInt(year),
        month: parseInt(month),
        nonWorkingDays: nonWorkingDays || []
      });
    }

    await calendar.save();

    console.log(' Calendario guardado:', calendar._id);

    console.log(' Sincronizando informe de revisión...');
    try {
      if (tokens) {
        await syncUserMonthReview(
          tokens,
          userId,
          userName || userId,
          parseInt(year),
          parseInt(month)
        );
        console.log(' Informe de revisión sincronizado automáticamente');
      } else {
        console.log(' No hay tokens disponibles, sincronización omitida');
      }
    } catch (syncError) {
      console.error(' Error sincronizando informe:', syncError.message);
    }

    res.json({
      success: true,
      message: 'Calendario actualizado e informe sincronizado',
      calendar
    });

  } catch (error) {
    console.error(' Error actualizando calendario:', error);
    res.status(500).json({
      error: 'Error al actualizar calendario',
      message: error.message
    });
  }
});

/**
 * Eliminar días no laborales de un mes
 * DELETE /api/calendar/clear
 */
router.delete('/clear', async (req, res) => {
  try {
    const { userId, year, month } = req.query;

    if (!userId || !year || !month) {
      return res.status(400).json({
        error: 'userId, year y month son requeridos'
      });
    }

    const result = await WorkCalendar.deleteOne({
      userId,
      year: parseInt(year),
      month: parseInt(month)
    });

    console.log(' Calendario eliminado:', result.deletedCount);

    res.json({
      success: true,
      message: 'Calendario eliminado',
      deleted: result.deletedCount
    });

  } catch (error) {
    console.error(' Error eliminando calendario:', error);
    res.status(500).json({
      error: 'Error al eliminar calendario',
      message: error.message
    });
  }
});

module.exports = router;
