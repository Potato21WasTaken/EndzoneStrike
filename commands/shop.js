const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const ShopItem = require('../data/models/ShopItem');
const User = require('../data/models/User');

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

    // Get user's inventory to show ownership status
    let user = await User.findOne({ discordId: interaction.user.id });
    if (!user) {
      user = await User.create({ discordId: interaction.user.id });
    }

    // Build the shop embed with ownership status
    const embed = new EmbedBuilder()
      .setTitle('🛒 Shop')
      .setDescription(`Welcome to the shop! You have **$${user.balance}** to spend.`)
      .setColor(0x00b6ff);

    // Add each item as a field for better formatting
    items.forEach(item => {
      const invItem = user.inventory.find(i => i.item === item.name);
      const ownedCount = invItem ? invItem.quantity : 0;
      
      let fieldValue = `💰 **Price:** $${item.price}\n`;
      if (item.description) {
        fieldValue += `📝 ${item.description}\n`;
      }
      fieldValue += `📦 **Owned:** ${ownedCount}`;
      if (item.stock > 0) {
        fieldValue += `\n📊 **Stock:** ${item.stock}`;
      }
      
      embed.addFields({
        name: `${item.name}`,
        value: fieldValue,
        inline: false
      });
    });

    // Create buttons for each item (max 5 per row, max 5 rows = 25 buttons)
    const buttons = [];
    for (let i = 0; i < items.length && i < 25; i++) {
      const item = items[i];
      const invItem = user.inventory.find(inv => inv.item === item.name);
      const ownedCount = invItem ? invItem.quantity : 0;
      
      // Check if user can afford and if item is in stock
      const canAfford = user.balance >= item.price;
      const inStock = item.stock !== 0;
      
      // For role items, only allow one purchase
      const alreadyOwned = item.type === 'role' && ownedCount > 0;
      
      const isDisabled = !canAfford || !inStock || alreadyOwned;
      
      let buttonLabel = `Buy ${item.name}`;
      if (alreadyOwned) {
        buttonLabel = `Already Owned`;
      }
      
      const button = new ButtonBuilder()
        .setCustomId(`shop_buy_${item._id}`)
        .setLabel(buttonLabel)
        .setStyle(isDisabled ? ButtonStyle.Secondary : ButtonStyle.Primary)
        .setDisabled(isDisabled);
      
      buttons.push(button);
    }

    // Organize buttons into rows (max 5 buttons per row)
    const rows = [];
    for (let i = 0; i < buttons.length; i += 5) {
      const row = new ActionRowBuilder().addComponents(buttons.slice(i, i + 5));
      rows.push(row);
    }

    await interaction.reply({ embeds: [embed], components: rows, ephemeral: false });
  }
};