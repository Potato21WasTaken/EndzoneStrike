const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const EconomyUser = require('../data/models/EconomyUser');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Check your balance or another user’s balance')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to check')
        .setRequired(false)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;
    let econUser = await EconomyUser.findOne({ discordId: target.id });
    if (!econUser) econUser = await EconomyUser.create({ discordId: target.id });

    const embed = new EmbedBuilder()
      .setTitle(`💰 Balance for ${target.username}`)
      .setDescription(`**$${econUser.balance}**`)
      .setColor(0x00ff99);

    await interaction.reply({ embeds: [embed], ephemeral: false });
  }
};