const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('suggest')
    .setDescription('Submit a suggestion')
    .addStringOption(option =>
      option.setName('text')
        .setDescription('Your suggestion')
        .setRequired(true)
    ),
  async execute(interaction) {
    const suggestion = interaction.options.getString('text');

    const embed = {
      title: 'New Suggestion',
      description: suggestion,
      color: 0x0099ff,
      author: {
        name: interaction.user.tag,
        icon_url: interaction.user.displayAvatarURL()
      }
    };

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`accept_${interaction.user.id}`)
        .setLabel('Accept')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`decline_${interaction.user.id}`)
        .setLabel('Decline')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`edit_${interaction.user.id}`)
        .setLabel('Edit')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`notes_${interaction.user.id}`)
        .setLabel('Notes')
        .setStyle(ButtonStyle.Secondary)
    );

    const suggestionChannel = interaction.guild.channels.cache.get('1393770504384544879');
    if (!suggestionChannel) {
      return interaction.reply({ content: 'Suggestion channel not found.', ephemeral: true });
    }

    const msg = await suggestionChannel.send({
      embeds: [embed],
      components: [buttons]
    });

    await msg.startThread({
      name: `Suggestion: ${interaction.user.username}`
    });

    await interaction.reply({ content: '✅ Suggestion submitted!', ephemeral: true });
  }
};
