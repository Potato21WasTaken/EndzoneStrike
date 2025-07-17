const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Path to cooldown JSON
const cooldownPath = path.join(__dirname, '..', 'data', 'auraCooldowns.json');
let cooldowns = JSON.parse(fs.readFileSync(cooldownPath, 'utf8'));

const auraStyles = [
  {
    name: "Golden Retriever BF Energy",
    emoji: "🐶",
    description: "You're sunshine in human form. Gives forehead kisses, opens doors, and always sends “let me know you got home safe.”",
    tags: ["loyal", "goofy", "good texter", "hypeman"]
  },
  {
    name: "Black Cat GF Energy",
    emoji: "🐈‍⬛",
    description: "Looks like they’d ghost you, but actually sends 'are you okay?' at 2am. Tough exterior, soft soul.",
    tags: ["mysterious", "sweet", "observant", "chill"]
  },
  {
    name: "Delulu Dreamer",
    emoji: "💅",
    description: "Fully convinced their crush is obsessed with them. Believes red flags are just passion.",
    tags: ["main character", "manifesting", "unbothered"]
  },
  {
    name: "Academic Weapon",
    emoji: "📚",
    description: "Color-coded notes. Slays group projects. Gives 100%, even for a 5-point quiz.",
    tags: ["focused", "organized", "matcha-powered"]
  },
  {
    name: "Chronically Online",
    emoji: "💻",
    description: "Can quote 3 TikToks in one sentence. Might diagnose people in the group chat.",
    tags: ["terminally online", "brainrot", "lore master"]
  },
  {
    name: "Low Effort Rizz",
    emoji: "🧢",
    description: "Pulls without trying. Said 'yo' and made someone fall in love.",
    tags: ["cool", "effortless", "natural charm"]
  },
  {
    name: "Soft Launch Pro",
    emoji: "🦋",
    description: "Posts a hand on their story and deletes it. The caption says, 'he fell first.'",
    tags: ["aesthetic", "mysterious", "strategic"]
  },
  {
    name: "Mystic Baddie",
    emoji: "🔮",
    description: "Sages their phone. Flirts by reading your birth chart.",
    tags: ["cosmic", "balanced", "flirty"]
  },
  {
    name: "Snack Energy",
    emoji: "🧃",
    description: "Hot *and* funny. A group chat menace but lovable.",
    tags: ["attractive", "chaotic", "funny"]
  },
  {
    name: "Battery at 3%",
    emoji: "🪫",
    description: "Running on vibes and caffeine. Wants rest but keeps watching Netflix.",
    tags: ["tired", "relatable", "burnt out"]
  }
];

function hasUsedToday(userId) {
  const today = new Date().toISOString().split('T')[0];
  return cooldowns[userId] === today;
}

function setCooldown(userId) {
  const today = new Date().toISOString().split('T')[0];
  cooldowns[userId] = today;
  fs.writeFileSync(cooldownPath, JSON.stringify(cooldowns, null, 2));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('aura-style')
    .setDescription('Get your daily aura vibe'),

  async execute(interaction) {
    const userId = interaction.user.id;

    if (hasUsedToday(userId)) {
      return interaction.reply({
        content: "🕒 You've already checked your aura style today. Come back tomorrow!",
        ephemeral: true
      });
    }

    const style = auraStyles[Math.floor(Math.random() * auraStyles.length)];

    const embed = new EmbedBuilder()
      .setTitle(`${style.emoji} Your Aura Style: ${style.name}`)
      .setDescription(`**${style.description}**\n\n✨ **Vibe Tags:** \`${style.tags.join(', ')}\``)
      .setColor(0xff90c2)
      .setFooter({ text: 'Come back tomorrow for a new style!' })
      .setTimestamp();

    setCooldown(userId);

    await interaction.reply({ embeds: [embed] });
  }
};
