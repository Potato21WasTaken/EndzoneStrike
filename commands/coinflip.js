const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const EconomyUser = require('../data/models/EconomyUser');

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

    // Validation
    if (amount <= 0) {
      return interaction.reply({
        content: '❌ Amount must be a positive number!',
        ephemeral: false
      });
    }

    let econUser = await EconomyUser.findOne({ discordId: userId });
    if (!econUser) econUser = await EconomyUser.create({ discordId: userId });

    if (econUser.balance < amount) {
      return interaction.reply({
        content: '❌ You do not have enough money to make this bet.',
        ephemeral: false
      });
    }

    // Coin flip logic
    const flip = Math.random() < 0.5 ? 'heads' : 'tails';
    let win = side === flip;

    if (win) {
      econUser.balance += amount; // Win: get double (add amount, since original bet is subtracted below)
    } else {
      econUser.balance -= amount; // Lose: subtract bet
    }
    await econUser.save();

    // Result message
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