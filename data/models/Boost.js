const mongoose = require('mongoose');

const boostSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g., "Small Luck Boost"
  bonusPercent: { type: Number, required: true }, // 5, 10, 20
  duration: { type: Number, default: 5 }, // uses (5 aura rolls)
  owner: { type: String }, // discordId of the user (if in inventory)
  expiresAt: { type: Date } // optional, for time-limited boosts
});

module.exports = mongoose.model('Boost', boostSchema);