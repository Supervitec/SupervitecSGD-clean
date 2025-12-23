const mongoose = require('mongoose');

const userSanctionSchema = new mongoose.Schema({
  // ==================== CAMPOS EXISTENTES ====================
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userName: {
    type: String,
    required: true
  },
  
  totalSanctions: {
    type: Number,
    default: 0
  },
  
  sanctionHistory: [{
    date: String,                 
    reason: String,               
    sanctionNumber: Number,       
    createdAt: Date
  }],
  
  lastSanctionDate: {
    type: Date,
    default: null
  },
  
  hasCitation: {
    type: Boolean,
    default: false
  },
  citationDate: {
    type: Date,
    default: null
  },
  
  // 🔥 NUEVO: Registro de emails de citación enviados
  citationEmails: [{
    sentDate: Date,
    sanctionCount: Number,
    emailSent: Boolean,
    recipients: [String]
  }],
  
  // ==================== SISTEMA DE BLOQUEOS ====================
  
  isBlocked: {
    type: Boolean,
    default: false
  },
  blockReason: {
    type: String,
    enum: ['ausencias_citacion', 'sanciones_graves', 'manual', 'otro'],
    default: null
  },
  blockedAt: {
    type: Date,
    default: null
  },
  blockedBy: {
    type: String,  
    default: null
  },
  
  missedCitations: {
    type: Number,
    default: 0
  },
  
  missedCitationHistory: [{
    citationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Citation'
    },
    date: Date,
    reason: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  unblockHistory: [{
    unblockedBy: String,  
    unblockedAt: Date,
    reason: String,
    notes: String
  }]
}, {
  timestamps: true
});

userSanctionSchema.index({ isBlocked: 1 });
userSanctionSchema.index({ hasCitation: 1 });

userSanctionSchema.methods.shouldBlockForAbsences = function() {
  return this.missedCitations >= 3 && !this.isBlocked;
};

userSanctionSchema.methods.getStatusSummary = function() {
  return {
    userId: this.userId,
    userName: this.userName,
    totalSanctions: this.totalSanctions,
    missedCitations: this.missedCitations,
    isBlocked: this.isBlocked,
    blockReason: this.blockReason,
    hasCitation: this.hasCitation,
    citationDate: this.citationDate,
    canFillPreop: !this.isBlocked
  };
};

module.exports = mongoose.model('UserSanction', userSanctionSchema);
