const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../data/models/User');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pay')
    .setDescription('Send money to another user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Recipient')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('Amount to send')
        .setRequired(true)
    ),

  async execute(interaction) {
    const senderId = interaction.user.id;
    const recipient = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');

    if (amount <= 0) {
      return interaction.reply({ content: '❌ Amount must be positive.', ephemeral: false });
    }
    if (recipient.id === senderId) {
      return interaction.reply({ content: '❌ You cannot pay yourself.', ephemeral: false });
    }

    const sender = await User.findOne({ discordId: senderId });
    let receiver = await User.findOne({ discordId: recipient.id });
    if (!receiver) receiver = await User.create({ discordId: recipient.id });

    if (!sender || sender.balance < amount) {
      return interaction.reply({ content: '❌ You do not have enough money.', ephemeral: false });
    }

    sender.balance -= amount;
    receiver.balance += amount;
    await sender.save();
    await receiver.save();

    const embed = new EmbedBuilder()
      .setTitle('💸 Payment Sent!')
      .setDescription(`You sent **$${amount}** to <@${recipient.id}>.`)
      .setColor(0x00b6ff);

    await interaction.reply({ embeds: [embed], ephemeral: false });
  }
};