const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  discordId: { type: String, required: true, unique: true },
  balance: { type: Number, default: 0 },
  lastCollect: { type: Date, default: new Date(0) },
  boosts: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Boost'
    }
  ],
  gifPerms: { type: Boolean, default: false },
  cooldowns: {
    rob: { type: Date, default: new Date(0) },
    work: { type: Map, of: Date, default: {} },
      daily: { type: Date, default: new Date(0) }
  },
  hoursWorked: { type: Map, of: Number, default: {} },
  inventory: [
    {
      item: { type: String },
      quantity: { type: Number, default: 1 }
    }
  ],
  currentJob: { type: String, default: null },
  jobStreak: {
    count: { type: Number, default: 0 },
    lastWorked: { type: Date, default: null }
  }
});

module.exports = mongoose.model('User', userSchema);