const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../data/models/user');
// At the top of daily.js and balance.js
module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Claim your daily reward.'),
  async execute(interaction) {
    return interaction.reply({ content: 'This command is currently disabled.', ephemeral: true });
  }
};  