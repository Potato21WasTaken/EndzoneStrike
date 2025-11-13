const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const User = require('../data/models/User');

const COOLDOWN_MS = 20 * 1000; // 20 seconds cooldown
const MAX_BET = 300;
const MIN_BET = 10;

const choices = ['rock', 'paper', 'scissors'];
const emojis = {
  rock: '🪨',
  paper: '📄',
  scissors: '✂️'
};

function determineWinner(playerChoice, botChoice) {
  if (playerChoice === botChoice) return 'tie';
  if (
    (playerChoice === 'rock' && botChoice === 'scissors') ||
    (playerChoice === 'paper' && botChoice === 'rock') ||
    (playerChoice === 'scissors' && botChoice === 'paper')
  ) {
    return 'win';
  }
  return 'lose';
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rps')
    .setDescription('Play Rock-Paper-Scissors and bet money!')
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
    const lastPlayed = user.cooldowns.rps || new Date(0);
    const now = Date.now();
    
    if (now - new Date(lastPlayed).getTime() < COOLDOWN_MS) {
      const timeLeft = Math.ceil((COOLDOWN_MS - (now - new Date(lastPlayed).getTime())) / 1000);
      return interaction.reply({
        content: `⏳ You can play RPS again in ${timeLeft} seconds!`,
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

    // Create buttons
    const buttons = choices.map(choice =>
      new ButtonBuilder()
        .setCustomId(`rps_${choice}`)
        .setLabel(choice.charAt(0).toUpperCase() + choice.slice(1))
        .setEmoji(emojis[choice])
        .setStyle(ButtonStyle.Primary)
    );
    const row = new ActionRowBuilder().addComponents(...buttons);

    const embed = new EmbedBuilder()
      .setTitle('🎮 Rock Paper Scissors')
      .setDescription(
        `You bet **$${bet}**!\n\n` +
        `Choose your move:\n` +
        `Win: +$${bet * 2} | Tie: Get bet back | Lose: Lose bet`
      )
      .setColor(0x5865F2)
      .setFooter({ text: 'You have 15 seconds to choose!' });

    await interaction.reply({ embeds: [embed], components: [row] });

    // Wait for button click
    const filter = i => i.user.id === userId && i.customId.startsWith('rps_');

    try {
      const buttonInteraction = await interaction.channel.awaitMessageComponent({
        filter,
        time: 15000
      });

      const playerChoice = buttonInteraction.customId.replace('rps_', '');
      const botChoice = choices[Math.floor(Math.random() * choices.length)];
      const result = determineWinner(playerChoice, botChoice);

      let winnings = 0;
      let resultMessage = '';
      let color = 0xFEE75C;

      if (result === 'win') {
        winnings = bet * 2;
        user.balance += winnings;
        resultMessage = `🎉 **YOU WIN!**\nYou won **$${winnings}**!`;
        color = 0x57F287;
      } else if (result === 'tie') {
        resultMessage = `🤝 **TIE!**\nYou get your bet back.`;
        color = 0xFEE75C;
      } else {
        user.balance -= bet;
        resultMessage = `💸 **YOU LOSE!**\nYou lost **$${bet}**.`;
        color = 0xED4245;
      }

      user.cooldowns.rps = new Date(now);
      await user.save();

      const resultEmbed = new EmbedBuilder()
        .setTitle('🎮 Rock Paper Scissors - Results')
        .setDescription(
          `You chose: ${emojis[playerChoice]} **${playerChoice}**\n` +
          `Bot chose: ${emojis[botChoice]} **${botChoice}**\n\n` +
          resultMessage
        )
        .setColor(color)
        .addFields(
          { name: 'New Balance', value: `$${user.balance}`, inline: true }
        );

      await buttonInteraction.update({ embeds: [resultEmbed], components: [] });
    } catch (error) {
      // Timeout - no choice made
      user.cooldowns.rps = new Date(now);
      await user.save();

      const timeoutEmbed = new EmbedBuilder()
        .setTitle('⏰ Time\'s Up!')
        .setDescription('You didn\'t make a choice in time!')
        .setColor(0xFEE75C);

      await interaction.editReply({ embeds: [timeoutEmbed], components: [] });
    }
  }
};
