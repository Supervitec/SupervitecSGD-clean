const mongoose = require('mongoose');

const citationSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  citationDate: {
    type: Date,
    required: true
  },
  reason: {
    type: String,
    enum: ['sanciones acumuladas', 'revision comportamiento', 'otro'],
    default: 'sanciones acumuladas'
  },
  reasonDetails: {
    type: String,
    default: ''
  },

  status: {
    type: String,
    enum: ['programada', 'se presento', 'no se presento', 'cancelada'],
    default: 'programada'
  },

  googleCalendarEventId: {
    type: String,
    default: null
  },

  attendanceMarkedBy: {
    type: String,
    default: null
  },
  attendanceMarkedAt: {
    type: Date,
    default: null
  },
  attendanceNotes: {
    type: String,
    default: ''
  },

  alertsSent: [{
    type: {
      type: String,
      enum: ['email', 'notification', 'calendar']
    },
    sentAt: Date,
    success: Boolean
  }],

  createdBy: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});



module.exports =
  mongoose.models.Citation || mongoose.model('Citation', citationSchema);
