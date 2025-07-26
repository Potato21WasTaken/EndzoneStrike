const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  discordId: { type: String, required: true },
  type: { type: String, enum: ['earn', 'spend', 'gamble', 'rob', 'buy', 'gift'], required: true },
  amount: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
  details: {} // any extra details: item bought, target user for rob/give, etc
});

module.exports = mongoose.model('Transaction', transactionSchema);