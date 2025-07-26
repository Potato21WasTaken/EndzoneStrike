const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Aura = require('../data/models/Aura');
const OWNER_ID = '531654863663267851';

function getAuraScore(userId) {
  if (userId === OWNER_ID) return 1_000_000;
  const chance = Math.random();
  if (chance < 0.40) return Math.floor(Math.random() * 1_000);
  if (chance < 0.65) return Math.floor(Math.random() * 9_000) + 1_001;
  if (chance < 0.85) return Math.floor(Math.random() * 90_000) + 10_001;
  if (chance < 0.97) return Math.floor(Math.random() * 400_000) + 100_001;
  if (chance < 0.996) return Math.floor(Math.random() * 250_000) + 500_001;
  if (chance < 0.999) return Math.floor(Math.random() * 249_999) + 750_001;
  return 1_000_000;
}

function getNote(score) {
  if (score <= 1000) return '💀 L aura. You might be cursed.';
  if (score <= 10000) return '🥴 Weak aura. Recharge needed.';
  if (score <= 100000) return '🌫️ Mediocre aura. Try meditating.';
  if (score <= 500000) return '✨ Decent aura! You have potential.';
  if (score < 1000000) return '🔥 Strong aura! You’re glowing.';
  return '👑 MAX AURA. You are the chosen one.';
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('aura')
    .setDescription('🔮 Get your aura score (1 - 1,000,000)'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });

    const userId = interaction.user.id;
    let auraUser;
    try {
      auraUser = await Aura.findOne({ discordId: userId });

      const score = getAuraScore(userId);
      const note = getNote(score);

      if (!auraUser) {
        auraUser = await Aura.create({
          discordId: userId,
          aura: score,
          bestAura: score,
          auraRolls: 1
        });
      } else {
        auraUser.aura = score;
        auraUser.auraRolls = (auraUser.auraRolls || 0) + 1;
        if (score > (auraUser.bestAura || 0)) auraUser.bestAura = score;
        await auraUser.save();
      }

      const embed = new EmbedBuilder()
        .setTitle('🔮 Your Aura')
        .setDescription(`Your aura is **${score.toLocaleString()}**.\n${note}`)
        .setColor(0xA020F0);

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error(`Aura save error for ${interaction.user.username}:`, err);
      await interaction.editReply({ content: 'Error saving your aura. Please try again later.' });
    }
  }
};