const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../data/models/User');

const COOLDOWN_MS = 30 * 1000; // 30 seconds cooldown
const MAX_BET = 500;
const MIN_BET = 10;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('diceroll')
    .setDescription('Roll dice and win based on the result!')
    .addIntegerOption(option =>
      option.setName('bet')
        .setDescription('Amount to bet')
        .setRequired(true)
        .setMinValue(MIN_BET)
        .setMaxValue(MAX_BET)
    ),

  async execute(interaction) {
    const userId = interaction.user.id;
    const bet = interaction.options.getInteger('bet');

    let user = await User.findOne({ discordId: userId });
    if (!user) user = await User.create({ discordId: userId });

    // Check cooldown
    if (!user.cooldowns) user.cooldowns = {};
    const lastPlayed = user.cooldowns.diceroll || new Date(0);
    const now = Date.now();
    
    if (now - new Date(lastPlayed).getTime() < COOLDOWN_MS) {
      const timeLeft = Math.ceil((COOLDOWN_MS - (now - new Date(lastPlayed).getTime())) / 1000);
      return interaction.reply({
        content: `⏳ You can roll dice again in ${timeLeft} seconds!`,
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

    // Roll two dice
    const dice1 = Math.floor(Math.random() * 6) + 1;
    const dice2 = Math.floor(Math.random() * 6) + 1;
    const total = dice1 + dice2;

    let winnings = 0;
    let resultMessage = '';
    let color = 0xED4245; // Red for loss

    // Determine outcome
    if (dice1 === dice2) {
      // Doubles: win 4x
      winnings = bet * 4;
      user.balance += winnings;
      resultMessage = `🎰 **DOUBLES!** You rolled matching dice!\nYou won **$${winnings}**!`;
      color = 0x57F287; // Green
    } else if (total === 7 || total === 11) {
      // Lucky seven or eleven: win 3x
      winnings = bet * 3;
      user.balance += winnings;
      resultMessage = `🍀 **LUCKY ${total}!** You hit a lucky number!\nYou won **$${winnings}**!`;
      color = 0x57F287; // Green
    } else if (total >= 9) {
      // High roll (9-12): win 2x
      winnings = bet * 2;
      user.balance += winnings;
      resultMessage = `📈 **HIGH ROLL!** You got ${total}!\nYou won **$${winnings}**!`;
      color = 0xFEE75C; // Yellow
    } else {
      // Low roll: lose bet
      user.balance -= bet;
      resultMessage = `📉 **LOW ROLL!** You only got ${total}.\nYou lost **$${bet}**.`;
      color = 0xED4245; // Red
    }

    user.cooldowns.diceroll = new Date(now);
    await user.save();

    const diceEmojis = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    const embed = new EmbedBuilder()
      .setTitle('🎲 Dice Roll')
      .setDescription(
        `You bet **$${bet}**\n\n` +
        `${diceEmojis[dice1 - 1]} + ${diceEmojis[dice2 - 1]} = **${total}**\n\n` +
        resultMessage
      )
      .setColor(color)
      .addFields(
        { name: 'New Balance', value: `$${user.balance}`, inline: true }
      )
      .setFooter({ text: 'Doubles: 4x | Lucky 7/11: 3x | 9-12: 2x | Otherwise: lose bet' });

    await interaction.reply({ embeds: [embed] });
  }
};
