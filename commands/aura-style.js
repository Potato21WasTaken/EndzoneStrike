const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Path to cooldown JSON
const cooldownPath = path.join(__dirname, '..', 'data', 'auraCooldowns.json');
let cooldowns = JSON.parse(fs.readFileSync(cooldownPath, 'utf8'));

const auraStyles = [
  {
    name: "Golden Retriever Energy",
    emoji: "🐶",
    description: "Always cheerful, helpful, and kind. The one who reminds everyone about game night.",
    tags: ["friendly", "loyal", "positive", "team player"]
  },
  {
    name: "Black Cat Energy",
    emoji: "🐈‍⬛",
    description: "Quiet and thoughtful. Observes everything, speaks only when it matters.",
    tags: ["calm", "mysterious", "deep thinker", "chill"]
  },
  {
    name: "Big Dreamer",
    emoji: "🌠",
    description: "Always planning their next big idea. Believes anything is possible.",
    tags: ["creative", "optimistic", "goal-setter"]
  },
  {
    name: "Study Pro",
    emoji: "📚",
    description: "Color-coded notes. Always prepared. Helps others before tests.",
    tags: ["organized", "focused", "helpful"]
  },
  {
    name: "Online Explorer",
    emoji: "🧭",
    description: "Knows every meme and video before they trend. Digital adventurer.",
    tags: ["tech-savvy", "curious", "funny"]
  },
  {
    name: "Effortless Cool",
    emoji: "🕶️",
    description: "Never tries too hard but still stands out. Confident in their own way.",
    tags: ["confident", "stylish", "laid-back"]
  },
  {
    name: "Subtle Star",
    emoji: "✨",
    description: "Doesn’t say much but always impresses when they do. Quiet confidence.",
    tags: ["shy", "unique", "impressive"]
  },
  {
    name: "Cosmic Thinker",
    emoji: "🌌",
    description: "Always wondering about space, life, and deep stuff.",
    tags: ["thoughtful", "philosophical", "daydreamer"]
  },
  {
    name: "Class Clown",
    emoji: "🎭",
    description: "The funny one who keeps everyone smiling, even during boring moments.",
    tags: ["funny", "energetic", "lighthearted"]
  },
  {
    name: "Running on Vibes",
    emoji: "⚡",
    description: "Always doing something, even when tired. Lives on snacks and motivation.",
    tags: ["energetic", "relatable", "driven"]
  },
  {
    name: "Nature Walker",
    emoji: "🌳",
    description: "Loves the outdoors. Always taking chill walks or snapping photos of trees.",
    tags: ["calm", "peaceful", "nature lover"]
  },
  {
    name: "Pixel Artist",
    emoji: "🎨",
    description: "Always creating something. Whether it’s digital art or doodles in class.",
    tags: ["artsy", "imaginative", "creative"]
  },
  {
    name: "Early Bird",
    emoji: "🌞",
    description: "Up early and already got things done while everyone else is waking up.",
    tags: ["motivated", "productive", "morning person"]
  },
  {
    name: "Quiet Genius",
    emoji: "🧠",
    description: "Doesn't brag but knows a lot. Surprises everyone with their knowledge.",
    tags: ["smart", "modest", "thoughtful"]
  },
  {
    name: "Kind Leader",
    emoji: "🫶",
    description: "Takes charge without bossing. Encourages others to shine too.",
    tags: ["supportive", "reliable", "leader"]
  },
  {
    name: "The Helper",
    emoji: "🛟",
    description: "First to lend a hand. Makes sure no one is left out or struggling.",
    tags: ["caring", "thoughtful", "compassionate"]
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
        content: "🕒 Wait 24 hours for a new aura-style!",
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
