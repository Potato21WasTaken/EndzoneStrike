const mongoose = require('mongoose');

const codeSchema = new mongoose.Schema({
  code: { 
    type: String, 
    required: true, 
    unique: true,
    uppercase: true,
    trim: true
  },
  discordId: { 
    type: String, 
    required: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  redeemed: { 
    type: Boolean, 
    default: false 
  },
  robloxUserId: { 
    type: String, 
    default: null 
  },
  redeemedAt: { 
    type: Date, 
    default: null 
  }
});

// Index for faster lookups
codeSchema.index({ code: 1 });
codeSchema.index({ robloxUserId: 1 });

module.exports = mongoose.model('Code', codeSchema);
