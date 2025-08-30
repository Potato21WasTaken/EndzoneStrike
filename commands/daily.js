const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const EconomyUser = require('../data/models/EconomyUser');

const ONE_DAY = 24 * 60 * 60 * 1000;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Claim your daily reward!'),

  async execute(interaction) {
    const userId = interaction.user.id;
    let econUser = await EconomyUser.findOne({ discordId: userId });
    if (!econUser) econUser = await EconomyUser.create({ discordId: userId });

    const lastClaim = econUser.cooldowns?.daily || new Date(0);
    const now = Date.now();

    if (now - new Date(lastClaim).getTime() < ONE_DAY) {
      const nextTime = new Date(lastClaim).getTime() + ONE_DAY;
      const waitHours = Math.ceil((nextTime - now) / (60 * 60 * 1000));
      return interaction.reply({
        content: `⏳ You already claimed your daily! Wait ${waitHours} hour(s).`,
        ephemeral: false
      });
    }

    // Random reward between $100 and $300
    const reward = Math.floor(Math.random() * 201) + 100;
    econUser.balance += reward;
    econUser.cooldowns.daily = new Date(now);
    await econUser.save();

    const embed = new EmbedBuilder()
      .setTitle('🌟 Daily Reward')
      .setDescription(`You claimed **$${reward}**!`)
      .setColor(0xFFD700);

    await interaction.reply({ embeds: [embed], ephemeral: false });
  }
};