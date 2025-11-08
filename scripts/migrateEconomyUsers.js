const mongoose = require('mongoose');
require('dotenv').config();

const oldEconomyUserSchema = new mongoose.Schema({
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
}, { collection: 'economyusers' }); // Make sure this matches your old collection

const EconomyUser = mongoose.model('EconomyUser', oldEconomyUserSchema);

const User = require('../data/models/User');

(async () => {
  await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

  const oldUsers = await EconomyUser.find({});
  let migrated = 0;

  for (const oldUser of oldUsers) {
    // Check if already exists in unified User collection
    let user = await User.findOne({ discordId: oldUser.discordId });
    if (!user) {
      // Map fields from old to new
      user = new User({
        discordId: oldUser.discordId,
        balance: oldUser.balance ?? 0,
        lastCollect: oldUser.lastMinuteCollect ?? new Date(0),
        cooldowns: {
          rob: oldUser.cooldowns?.rob ?? new Date(0),
          work: new Map(), // No work history in old schema
          daily: oldUser.cooldowns?.daily ?? new Date(0),
          weekly: oldUser.cooldowns?.weekly ?? new Date(0)
        },
        inventory: (oldUser.inventory || []).map(inv => ({
          item: typeof inv.item === 'object' && inv.item.toString ? inv.item.toString() : String(inv.item),
          quantity: inv.quantity ?? 1
        }))
      });
      await user.save();
      migrated++;
    }
  }

  console.log(`✅ Migration finished! Migrated ${migrated} users.`);
  await mongoose.disconnect();
})();