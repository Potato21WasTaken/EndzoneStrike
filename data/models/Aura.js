const mongoose = require('mongoose');

const auraSchema = new mongoose.Schema({
  discordId: { type: String, required: true, unique: true },
  aura: { type: Number, default: 0 },
  bestAura: { type: Number, default: 0 },
  auraRolls: { type: Number, default: 0 },
  boostsActive: [
    {
      boost: { type: mongoose.Schema.Types.ObjectId, ref: 'Boost' },
      usesLeft: { type: Number, default: 0 }
    }
  ]
});

module.exports = mongoose.model('Aura', auraSchema);