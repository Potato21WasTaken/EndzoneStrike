const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const ShopItem = require('../data/models/ShopItem');
const User = require('../data/models/User');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('buy')
    .setDescription('Buy an item from the shop')
    .addStringOption(option =>
      option.setName('item')
        .setDescription('Item name to buy')
        .setRequired(true)
    ),

  async execute(interaction) {
    const itemName = interaction.options.getString('item');
    const item = await ShopItem.findOne({ name: new RegExp(`^${itemName}$`, 'i') });
    if (!item) {
      return interaction.reply({ content: '❌ Item not found.', ephemeral: false });
    }
    if (item.stock === 0) {
      return interaction.reply({ content: '❌ This item is out of stock.', ephemeral: false });
    }

    let user = await User.findOne({ discordId: interaction.user.id });
    if (!user) user = await User.create({ discordId: interaction.user.id });

    if (user.balance < item.price) {
      return interaction.reply({ content: '❌ You cannot afford this item.', ephemeral: false });
    }

    // Update inventory
    let invItem = user.inventory.find(i => i.item === item.name);
    if (invItem) {
      invItem.quantity += 1;
    } else {
      user.inventory.push({ item: item.name, quantity: 1 });
    }
    user.balance -= item.price;

    // Update item stock if not unlimited
    if (item.stock > 0) item.stock -= 1;

    await user.save();
    await item.save();

    const embed = new EmbedBuilder()
      .setTitle('✅ Purchase Successful')
      .setDescription(`You bought **${item.name}** for $${item.price}.\nCheck your inventory with future commands!`)
      .setColor(0x00ff99);

    await interaction.reply({ embeds: [embed], ephemeral: false });
  }
};