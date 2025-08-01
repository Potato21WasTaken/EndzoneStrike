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
    rob: { type: Date, default: new Date(0) }
  }
});

module.exports = mongoose.model('User', userSchema);