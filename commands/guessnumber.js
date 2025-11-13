const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../data/models/User');

const COOLDOWN_MS = 45 * 1000; // 45 seconds cooldown
const MAX_BET = 1000;
const MIN_BET = 10;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('guessnumber')
    .setDescription('Guess a number between 1-10 to win money!')
    .addIntegerOption(option =>
      option.setName('bet')
        .setDescription('Amount to bet')
        .setRequired(true)
        .setMinValue(MIN_BET)
        .setMaxValue(MAX_BET)
    )
    .addIntegerOption(option =>
      option.setName('guess')
        .setDescription('Your guess (1-10)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(10)
    ),

  async execute(interaction) {
    const userId = interaction.user.id;
    const bet = interaction.options.getInteger('bet');
    const guess = interaction.options.getInteger('guess');

    let user = await User.findOne({ discordId: userId });
    if (!user) user = await User.create({ discordId: userId });

    // Check cooldown
    if (!user.cooldowns) user.cooldowns = {};
    const lastPlayed = user.cooldowns.guessnumber || new Date(0);
    const now = Date.now();
    
    if (now - new Date(lastPlayed).getTime() < COOLDOWN_MS) {
      const timeLeft = Math.ceil((COOLDOWN_MS - (now - new Date(lastPlayed).getTime())) / 1000);
      return interaction.reply({
        content: `⏳ You can play guess number again in ${timeLeft} seconds!`,
        ephemeral: true
      });
    }

    // Check if user has enough money
    if (user.balance < bet) {
      return interaction.reply({
        content: `❌ You don't have enough money! Your balance: $${user.balance}`,
        ephemeral: true
      });
    }

    // Generate random number
    const randomNumber = Math.floor(Math.random() * 10) + 1;
    const isCorrect = guess === randomNumber;

    let winnings = 0;
    let resultMessage = '';

    if (isCorrect) {
      // Exact match: win 5x bet
      winnings = bet * 5;
      user.balance += winnings;
      resultMessage = `🎉 **JACKPOT!** You guessed correctly!\nYou won **$${winnings}**!`;
    } else if (Math.abs(guess - randomNumber) === 1) {
      // Close (off by 1): win 2x bet
      winnings = bet * 2;
      user.balance += winnings;
      resultMessage = `🔥 **So close!** You were off by 1!\nYou won **$${winnings}**!`;
    } else {
      // Wrong: lose bet
      user.balance -= bet;
      resultMessage = `💸 **Wrong!** Better luck next time!\nYou lost **$${bet}**.`;
    }

    user.cooldowns.guessnumber = new Date(now);
    await user.save();

    const embed = new EmbedBuilder()
      .setTitle('🎲 Number Guessing Game')
      .setDescription(
        `You bet **$${bet}** and guessed **${guess}**.\n` +
        `The number was **${randomNumber}**!\n\n` +
        resultMessage
      )
      .setColor(isCorrect ? 0x57F287 : (winnings > 0 ? 0xFEE75C : 0xED4245))
      .addFields(
        { name: 'New Balance', value: `$${user.balance}`, inline: true }
      )
      .setFooter({ text: 'Exact match: 5x | Off by 1: 2x | Otherwise: lose bet' });

    await interaction.reply({ embeds: [embed] });
  }
};
