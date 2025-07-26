const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Aura = require('../data/models/Aura');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('auraboard')
    .setDescription('📊 View the top 15 aura scores (and your score if not ranked)'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });

    let top, all;
    try {
      top = await Aura.find({ aura: { $exists: true } })
        .sort({ aura: -1 })
        .limit(15)
        .select('discordId aura bestAura auraRolls');
      all = await Aura.find({ aura: { $exists: true } })
        .sort({ aura: -1 })
        .select('discordId aura bestAura auraRolls');
    } catch (err) {
      console.error(`AuraBoard DB error for ${interaction.user.username}:`, err);
      return interaction.editReply({ content: 'Error loading leaderboard.' });
    }

    const userId = interaction.user.id;
    const userRank = all.findIndex(u => u.discordId === userId) + 1;
    const userAura = all.find(u => u.discordId === userId)?.aura;

    let description;
    if (!top.length) {
      description = '📭 No aura scores yet.';
    } else {
      description = top
        .map((u, i) => `**${i + 1}.** <@${u.discordId}> — ${u.aura.toLocaleString()}`)
        .join('\n');
      // If user is not in top 15, show their rank below the board
      if (userAura !== undefined && userRank > 15) {
        description += `\n\n**Your Rank:**\n**${userRank}.** <@${userId}> — ${userAura.toLocaleString()} (you)`;
      }
    }

    const embed = new EmbedBuilder()
      .setTitle('🔮 Aura Leaderboard — Top 15')
      .setColor(0x9932CC)
      .setDescription(description)
      .setFooter({ text: 'Based on your most recent aura roll' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};