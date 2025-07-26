const mongoose = require('mongoose');

const shopItemSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // e.g., "Small Luck Boost"
  description: { type: String },
  price: { type: Number, required: true },
  stock: { type: Number, default: 0 }, // -1 for unlimited
  type: { type: String, enum: ["boost", "role"] },
  boost: { type: mongoose.Schema.Types.ObjectId, ref: 'Boost' }, // for boosts, reference
  roleId: { type: String } // for role, Discord role ID
});

module.exports = mongoose.model('ShopItem', shopItemSchema);