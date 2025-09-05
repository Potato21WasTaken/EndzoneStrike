const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const ShopItem = require('../data/models/ShopItem');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('View the shop and items you can buy!'),

  async execute(interaction) {
    const items = await ShopItem.find({ stock: { $ne: 0 } });
    if (!items.length) {
      return interaction.reply({
        content: "❌ The shop is currently empty.",
        ephemeral: false
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('🛒 Shop')
      .setDescription(
        items.map(item =>
          `**${item.name}** — $${item.price}\n${item.description || ''} ${(item.stock > 0 ? `\nStock: ${item.stock}` : '')}`
        ).join('\n\n')
      )
      .setColor(0x00b6ff);

    await interaction.reply({ embeds: [embed], ephemeral: false });
  }
};