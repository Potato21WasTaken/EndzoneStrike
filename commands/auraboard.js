const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const AURA_FILE = path.join(__dirname, '..', 'data', 'aura.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('auraboard')
    .setDescription('📊 View the top 15 aura scores'),

  async execute(interaction) {
    if (!fs.existsSync(AURA_FILE)) {
      return interaction.reply('⚠️ No aura data found.');
    }

    const raw = fs.readFileSync(AURA_FILE, 'utf8');
    const data = JSON.parse(raw);
    if (!data.users.length) {
      return interaction.reply('📭 No aura scores yet.');
    }

    const top = [...data.users]
      .sort((a, b) => b.score - a.score)
      .slice(0, 15); // 🔥 Limit to top 15

    const embed = new EmbedBuilder()
      .setTitle('🔮 Aura Leaderboard — Top 15')
      .setColor(0x9932CC)
      .setDescription(
        top
          .map((u, i) => `**${i + 1}.** ${u.username} — ${u.score.toLocaleString()}`)
          .join('\n')
      )
      .setFooter({ text: 'Based on your most recent aura roll' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
