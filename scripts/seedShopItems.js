const mongoose = require('mongoose');
require('dotenv').config();
const ShopItem = require('../data/models/ShopItem');

const items = [
  {
    name: "Laptop",
    description: "Required to work as a Programmer or Streamer.",
    price: 1500,
    stock: -1,
    type: "boost"
  },
  {
    name: "Microphone",
    description: "Required to work as a Streamer.",
    price: 800,
    stock: -1,
    type: "boost"
  },
  {
    name: "Chef Hat",
    description: "Required to work as a Chef.",
    price: 500,
    stock: -1,
    type: "boost"
  }
];

(async () => {
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  for (const item of items) {
    const exists = await ShopItem.findOne({ name: item.name });
    if (!exists) {
      await ShopItem.create(item);
      console.log(`Added: ${item.name}`);
    } else {
      console.log(`Item already exists: ${item.name}`);
    }
  }

  await mongoose.disconnect();
  console.log('Done!');
})();