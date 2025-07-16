const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const AURA_FILE = path.join(__dirname, '..', 'data', 'aura.json');
const OWNER_ID = '531654863663267851'; // your Discord ID

function getAuraScore(userId) {
  if (userId === OWNER_ID) return 1_000_000;

  const chance = Math.random();

  if (chance < 0.40) return Math.floor(Math.random() * 1_000);               // 0–999
  if (chance < 0.65) return Math.floor(Math.random() * 9_000) + 1_001;       // 1,001–10,000
  if (chance < 0.85) return Math.floor(Math.random() * 90_000) + 10_001;     // 10,001–100,000
  if (chance < 0.97) return Math.floor(Math.random() * 400_000) + 100_001;   // 100,001–500,000
  if (chance < 0.996) return Math.floor(Math.random() * 250_000) + 500_001;  // 500,001–750,000
  if (chance < 0.999) return Math.floor(Math.random() * 249_999) + 750_001;  // 750,001–999,999
  return 1_000_000; // max aura
}

function getNote(score) {
  if (score <= 1000) return '💀 L aura. You might be cursed.';
  if (score <= 10000) return '🥴 Weak aura. Recharge needed.';
  if (score <= 100000) return '🌫️ Mediocre aura. Try meditating.';
  if (score <= 500000) return '✨ Decent aura! You have potential.';
  if (score < 1000000) return '🔥 Strong aura! You’re glowing.';
  return '👑 MAX AURA. You are the chosen one.';
}

function saveAura(userId, username, score) {
  let data = { users: [] };
  if (fs.existsSync(AURA_FILE)) {
    data = JSON.parse(fs.readFileSync(AURA_FILE, 'utf8'));
  }

  const existing = data.users.find(u => u.id === userId);
  if (existing) {
    existing.score = score;
    existing.username = username;
  } else {
    data.users.push({ id: userId, username, score });
  }

  fs.writeFileSync(AURA_FILE, JSON.stringify(data, null, 2));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('aura')
    .setDescription('🔮 Get your aura score (1 - 1,000,000)'),

  async execute(interaction) {
    const score = getAuraScore(interaction.user.id);
    const note = getNote(score);
    saveAura(interaction.user.id, interaction.user.username, score);

    await interaction.reply(`🔮 Your aura is **${score.toLocaleString()}**.\n${note}`);
  }
};

