const mongoose = require('mongoose');

const economyUserSchema = new mongoose.Schema({
  discordId: { type: String, required: true, unique: true },
  balance: { type: Number, default: 0 },
  lastMinuteCollect: { type: Date, default: new Date(0) },
  cooldowns: {
    daily: { type: Date, default: new Date(0) },
    weekly: { type: Date, default: new Date(0) },
    work: { type: Date, default: new Date(0) },
    rob: { type: Date, default: new Date(0) }
  },
  inventory: [
    {
      item: { type: mongoose.Schema.Types.ObjectId, ref: 'ShopItem' },
      quantity: { type: Number, default: 1 }
    }
  ]
});

module.exports = mongoose.model('EconomyUser', economyUserSchema);