const mongoose = require('mongoose');

const preoperationalRecordSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  userName: {
    type: String,
    required: true
  },
  date: {
    type: String, 
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['completado', 'entregado_tarde', 'no_entregado', 'dia_no_laboral'],
    default: 'no_entregado'
  },
  deliveryTime: {
    type: Date,
    default: null
  },
  formData: {
    type: Object,
    default: null
  },
  wasLate: {
    type: Boolean,
    default: false
  },
  adminNotified: {
    type: Boolean,
    default: false
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

preoperationalRecordSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('PreoperationalRecord', preoperationalRecordSchema);
