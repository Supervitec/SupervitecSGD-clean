const mongoose = require('mongoose');

const workCalendarSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  userName: {
    type: String,
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  month: {
    type: Number,
    required: true
  },
  nonWorkingDays: [{
    type: String, 
    required: true
  }],
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

workCalendarSchema.index({ userId: 1, year: 1, month: 1 });

module.exports = mongoose.model('WorkCalendar', workCalendarSchema);
