const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Shows your current balance.'),
  async execute(interaction) {
    return interaction.reply({ content: 'This command is currently disabled.', ephemeral: true });
  }
};