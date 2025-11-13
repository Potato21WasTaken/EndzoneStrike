const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../data/models/User');

const COOLDOWN_MS = 40 * 1000; // 40 seconds cooldown
const MAX_BET = 500;
const MIN_BET = 10;

const symbols = ['🍒', '🍋', '🍊', '🍇', '💎', '7️⃣'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slots')
    .setDescription('Try your luck at the slot machine!')
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
    const lastPlayed = user.cooldowns.slots || new Date(0);
    const now = Date.now();
    
    if (now - new Date(lastPlayed).getTime() < COOLDOWN_MS) {
      const timeLeft = Math.ceil((COOLDOWN_MS - (now - new Date(lastPlayed).getTime())) / 1000);
      return interaction.reply({
        content: `⏳ You can play slots again in ${timeLeft} seconds!`,
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

    // Send initial spinning message
    await interaction.reply({
      content: '🎰 Spinning the slots... 🎰',
      ephemeral: false
    });

    // Simulate spinning delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Roll the slots
    const roll1 = symbols[Math.floor(Math.random() * symbols.length)];
    const roll2 = symbols[Math.floor(Math.random() * symbols.length)];
    const roll3 = symbols[Math.floor(Math.random() * symbols.length)];

    let winnings = 0;
    let resultMessage = '';
    let color = 0xED4245;
    let multiplier = 0;

    // Check for wins
    if (roll1 === roll2 && roll2 === roll3) {
      // All three match - JACKPOT!
      if (roll1 === '7️⃣') {
        multiplier = 20;
        resultMessage = '💰 **SUPER JACKPOT!!!** Three 7s!';
        color = 0xFFD700; // Gold
      } else if (roll1 === '💎') {
        multiplier = 10;
        resultMessage = '💎 **DIAMOND JACKPOT!!** Three diamonds!';
        color = 0x00D9FF; // Diamond blue
      } else {
        multiplier = 5;
        resultMessage = '🎉 **JACKPOT!** Three of a kind!';
        color = 0x57F287; // Green
      }
      winnings = bet * multiplier;
      user.balance += winnings;
    } else if (roll1 === roll2 || roll2 === roll3 || roll1 === roll3) {
      // Two match - small win
      multiplier = 2;
      winnings = bet * multiplier;
      user.balance += winnings;
      resultMessage = '✨ **MATCH!** Two symbols matched!';
      color = 0xFEE75C; // Yellow
    } else {
      // No match - lose bet
      user.balance -= bet;
      resultMessage = '💸 **NO MATCH!** Better luck next time!';
      color = 0xED4245; // Red
    }

    user.cooldowns.slots = new Date(now);
    await user.save();

    const embed = new EmbedBuilder()
      .setTitle('🎰 Slot Machine')
      .setDescription(
        `**[ ${roll1} | ${roll2} | ${roll3} ]**\n\n` +
        resultMessage +
        (multiplier > 0 ? `\n\nYou won **$${winnings}** (${multiplier}x your bet)!` : `\n\nYou lost **$${bet}**.`)
      )
      .setColor(color)
      .addFields(
        { name: 'Bet', value: `$${bet}`, inline: true },
        { name: 'New Balance', value: `$${user.balance}`, inline: true }
      )
      .setFooter({ text: 'Three 7s: 20x | Three 💎: 10x | Three match: 5x | Two match: 2x' });

    await interaction.editReply({ content: '', embeds: [embed] });
  }
};
