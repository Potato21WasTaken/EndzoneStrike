const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../data/models/User');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('Gamble your money on a coin flip! 50/50 chance to double it or lose it.')
    .addStringOption(option =>
      option.setName('side')
        .setDescription('Pick heads or tails')
        .setRequired(true)
        .addChoices(
          { name: 'Heads', value: 'heads' },
          { name: 'Tails', value: 'tails' }
        )
    )
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('Amount to bet')
        .setRequired(true)
    ),

  async execute(interaction) {
    const userId = interaction.user.id;
    const side = interaction.options.getString('side');
    const amount = interaction.options.getInteger('amount');

    if (amount <= 0) {
      return interaction.reply({
        content: '❌ Amount must be a positive number!',
        ephemeral: false
      });
    }

    let user = await User.findOne({ discordId: userId });
    if (!user) user = await User.create({ discordId: userId });

    if (user.balance < amount) {
      return interaction.reply({
        content: '❌ You do not have enough money to make this bet.',
        ephemeral: false
      });
    }

    // Coin flip logic
    const flip = Math.random() < 0.5 ? 'heads' : 'tails';
    let win = side === flip;

    if (win) {
      user.balance += amount; // Win: get double (add amount, since original bet is subtracted below)
    } else {
      user.balance -= amount; // Lose: subtract bet
    }
    await user.save();

    const embed = new EmbedBuilder()
      .setTitle('🪙 Coinflip Results')
      .setDescription(
        `You bet **$${amount}** on **${side.toUpperCase()}**.\n` +
        `The coin landed on **${flip.toUpperCase()}**!\n\n` +
        (win
          ? `🎉 **You win $${amount * 2}!**`
          : `💸 **You lost $${amount}.**`)
      )
      .setColor(win ? 0x00ff99 : 0xff5555)
      .setFooter({ text: win ? 'Feeling lucky today!' : 'Better luck next time!' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: false });
  }
};