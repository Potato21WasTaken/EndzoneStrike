const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../data/models/User');

(async () => {
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  const users = await User.find({});
  for (const user of users) {
    let updated = false;
    if (typeof user.balance !== 'number') {
      user.balance = 0;
      updated = true;
    }
    if (!user.inventory) {
      user.inventory = [];
      updated = true;
    }
    if (!user.cooldowns || !user.cooldowns.work) {
      user.cooldowns = user.cooldowns || {};
      user.cooldowns.work = new Map();
      updated = true;
    }
    if (!user.hoursWorked) {
      user.hoursWorked = new Map();
      updated = true;
    }
    if (updated) await user.save();
  }
  console.log('Patched users.');
  mongoose.disconnect();
})();