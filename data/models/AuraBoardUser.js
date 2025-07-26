const mongoose = require('mongoose');

const auraBoardUserSchema = new mongoose.Schema({
  discordId: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  score: { type: Number, default: 0 }
});

module.exports = mongoose.model('AuraBoardUser', auraBoardUserSchema);