const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../data/models/User');

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
    await interaction.deferReply({ ephemeral: false }); // <-- ADD THIS LINE

    const target = interaction.options.getUser('user') || interaction.user;
    let user = await User.findOne({ discordId: target.id });
    if (!user) user = await User.create({ discordId: target.id });

    const embed = new EmbedBuilder()
      .setTitle(`💰 Balance for ${target.username}`)
      .setDescription(`**$${user.balance ?? 0}**`)
      .setColor(0x00ff99);

    await interaction.editReply({ embeds: [embed] }); // <-- USE editReply
  }
};