const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const User = require('../data/models/User');

const COOLDOWN_MS = 60 * 1000; // 1 minute cooldown
const BASE_REWARD = 50;
const BONUS_REWARD = 100; // Extra for correct answer

const triviaQuestions = [
  {
    question: "What is the capital of France?",
    choices: ["London", "Berlin", "Paris", "Madrid"],
    correct: 2
  },
  {
    question: "Which planet is known as the Red Planet?",
    choices: ["Venus", "Mars", "Jupiter", "Saturn"],
    correct: 1
  },
  {
    question: "What is 15 x 8?",
    choices: ["100", "110", "120", "130"],
    correct: 2
  },
  {
    question: "Who painted the Mona Lisa?",
    choices: ["Michelangelo", "Leonardo da Vinci", "Raphael", "Donatello"],
    correct: 1
  },
  {
    question: "What is the largest ocean on Earth?",
    choices: ["Atlantic", "Indian", "Arctic", "Pacific"],
    correct: 3
  },
  {
    question: "How many sides does a hexagon have?",
    choices: ["5", "6", "7", "8"],
    correct: 1
  },
  {
    question: "What is the smallest prime number?",
    choices: ["0", "1", "2", "3"],
    correct: 2
  },
  {
    question: "In what year did World War II end?",
    choices: ["1943", "1944", "1945", "1946"],
    correct: 2
  },
  {
    question: "What is the chemical symbol for gold?",
    choices: ["Go", "Gd", "Au", "Ag"],
    correct: 2
  },
  {
    question: "How many continents are there?",
    choices: ["5", "6", "7", "8"],
    correct: 2
  }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trivia')
    .setDescription('Answer trivia questions to earn money!'),

  async execute(interaction) {
    const userId = interaction.user.id;
    let user = await User.findOne({ discordId: userId });
    if (!user) user = await User.create({ discordId: userId });

    // Check cooldown
    if (!user.cooldowns) user.cooldowns = {};
    const lastPlayed = user.cooldowns.trivia || new Date(0);
    const now = Date.now();
    
    if (now - new Date(lastPlayed).getTime() < COOLDOWN_MS) {
      const timeLeft = Math.ceil((COOLDOWN_MS - (now - new Date(lastPlayed).getTime())) / 1000);
      return interaction.reply({
        content: `⏳ You can play trivia again in ${timeLeft} seconds!`,
        ephemeral: true
      });
    }

    // Pick random question
    const question = triviaQuestions[Math.floor(Math.random() * triviaQuestions.length)];
    
    // Create buttons for choices
    const buttons = question.choices.map((choice, idx) =>
      new ButtonBuilder()
        .setCustomId(`trivia_${idx}`)
        .setLabel(choice)
        .setStyle(ButtonStyle.Primary)
    );
    const row = new ActionRowBuilder().addComponents(...buttons);

    const embed = new EmbedBuilder()
      .setTitle('🧠 Trivia Time!')
      .setDescription(`**${question.question}**\n\nCorrect answer: +$${BASE_REWARD + BONUS_REWARD}\nWrong answer: +$${BASE_REWARD}`)
      .setColor(0x5865F2)
      .setFooter({ text: 'You have 15 seconds to answer!' });

    await interaction.reply({ embeds: [embed], components: [row] });

    // Wait for button click
    const filter = i => i.user.id === userId && i.customId.startsWith('trivia_');
    let answered = false;

    try {
      const buttonInteraction = await interaction.channel.awaitMessageComponent({
        filter,
        time: 15000
      });

      answered = true;
      const choiceIdx = parseInt(buttonInteraction.customId.replace('trivia_', ''));
      const isCorrect = choiceIdx === question.correct;
      
      let reward = BASE_REWARD;
      if (isCorrect) {
        reward += BONUS_REWARD;
      }

      user.balance += reward;
      user.cooldowns.trivia = new Date(now);
      await user.save();

      const resultEmbed = new EmbedBuilder()
        .setTitle(isCorrect ? '✅ Correct!' : '❌ Wrong!')
        .setDescription(
          isCorrect
            ? `Great job! You earned **$${reward}**!`
            : `The correct answer was **${question.choices[question.correct]}**.\nBut you still earned **$${reward}** for trying!`
        )
        .setColor(isCorrect ? 0x57F287 : 0xED4245)
        .addFields({ name: 'New Balance', value: `$${user.balance}`, inline: true });

      await buttonInteraction.update({ embeds: [resultEmbed], components: [] });
    } catch (error) {
      // Timeout - no answer
      user.cooldowns.trivia = new Date(now);
      await user.save();

      const timeoutEmbed = new EmbedBuilder()
        .setTitle('⏰ Time\'s Up!')
        .setDescription(`You didn't answer in time!\nThe correct answer was **${question.choices[question.correct]}**.`)
        .setColor(0xFEE75C);

      await interaction.editReply({ embeds: [timeoutEmbed], components: [] });
    }
  }
};
