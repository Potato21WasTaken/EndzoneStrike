const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('View user information and (if staff) moderation history')
    .addUserOption(option =>
      option.setName('target')
        .setDescription('User to view info for')
        .setRequired(false)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('target') || interaction.user;
    const targetId = targetUser.id;
    const modlogChannel = interaction.guild.channels.cache.get(process.env.MODLOG_CHANNEL_ID);
    const isVerifiedStaff = interaction.member.roles.cache.has(process.env.VERIFIED_STAFF_ROLE_ID);

    let member = null;
    try {
      member = await interaction.guild.members.fetch(targetId);
    } catch (_) {}

    const userEmbed = new EmbedBuilder()
      .setTitle(`User Info: ${targetUser.tag}`)
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .setColor('Blurple')
      .addFields(
        { name: '🆔 User ID', value: targetId, inline: true },
        { name: '📅 Account Created', value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:F>`, inline: true }
      );

    if (member) {
      userEmbed.addFields(
        { name: '📥 Joined Server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`, inline: true },
        {
          name: '🔰 Roles',
          value: member.roles.cache
            .filter(r => r.id !== interaction.guild.id)
            .map(r => `<@&${r.id}>`)
            .join(', ') || 'None',
          inline: false
        }
      );
    } else {
      userEmbed.addFields({
        name: '❌ Not in Server',
        value: 'This user is not currently a member of the server.',
        inline: false
      });
    }

    await interaction.reply({ embeds: [userEmbed] });

    if (!isVerifiedStaff) return;

    if (!modlogChannel || !modlogChannel.isTextBased()) {
      return interaction.followUp({
        content: '⚠️ Modlog channel not accessible.',
        ephemeral: true
      });
    }

    const messages = await modlogChannel.messages.fetch({ limit: 100 });
    const logs = [];

    const actionKeywords = ['warn', 'kicked', 'mute', 'banned', 'timed out', 'timeout'];
    const excludeKeywords = ['unwarn', 'unmute', 'unban', 'untimeout'];

    for (const msg of messages.values()) {
      for (const embed of msg.embeds) {
        const content = [
          embed.title,
          embed.description,
          ...embed.fields?.map(f => `${f.name} ${f.value}`) || []
        ].join('\n').toLowerCase();

        const isTarget = content.includes(targetId) || embed.description?.includes(`<@${targetId}>`);

        if (!isTarget) continue;
        if (excludeKeywords.some(word => content.includes(word))) continue;

        const matchedAction = actionKeywords.find(k => content.includes(k));
        if (!matchedAction) continue;

        const reasonField = embed.fields?.find(f =>
          /reason/i.test(f.name) || /reason/i.test(f.value)
        );

        logs.push({
          type: matchedAction.toUpperCase(),
          reason: reasonField?.value || 'No reason provided',
          timestamp: `<t:${Math.floor(msg.createdTimestamp / 1000)}:f>`,
          link: `https://discord.com/channels/${msg.guildId}/${msg.channelId}/${msg.id}`
        });
      }
    }

    if (logs.length === 0) {
      return interaction.followUp({
        content: '✅ No moderation history found for this user.',
        ephemeral: true
      });
    }

    let page = 0;
    const itemsPerPage = 5;
    const totalPages = Math.ceil(logs.length / itemsPerPage);

    const renderPage = (pageNum) => {
      const slice = logs.slice(pageNum * itemsPerPage, pageNum * itemsPerPage + itemsPerPage);
      return new EmbedBuilder()
        .setTitle(`📝 Moderation History (${pageNum + 1}/${totalPages})`)
        .setColor('Red')
        .setDescription(
          slice
            .map(
              log =>
                `**${log.type}** — ${log.timestamp}\nReason: ${log.reason}\n[View Log](${log.link})`
            )
            .join('\n\n')
        )
        .setFooter({ text: 'Showing recent moderation actions from modlog embeds' });
    };

    const prevButton = new ButtonBuilder()
      .setCustomId('modlog_prev')
      .setLabel('⏮ Prev')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true);

    const nextButton = new ButtonBuilder()
      .setCustomId('modlog_next')
      .setLabel('⏭ Next')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(totalPages === 1);

    const deleteButton = new ButtonBuilder()
      .setCustomId('modlog_delete')
      .setLabel('❌ Close')
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(prevButton, nextButton, deleteButton);

    const msg = await interaction.followUp({
      embeds: [renderPage(page)],
      components: [row],
      ephemeral: true
    });

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60_000,
      filter: i => i.user.id === interaction.user.id
    });

    collector.on('collect', async i => {
      if (i.customId === 'modlog_prev') page--;
      else if (i.customId === 'modlog_next') page++;
      else if (i.customId === 'modlog_delete') {
        collector.stop();
        return i.update({ content: '❌ Closed.', components: [], embeds: [] });
      }

      prevButton.setDisabled(page === 0);
      nextButton.setDisabled(page === totalPages - 1);

      await i.update({ embeds: [renderPage(page)], components: [row] });
    });

    collector.on('end', async () => {
      prevButton.setDisabled(true);
      nextButton.setDisabled(true);
      deleteButton.setDisabled(true);
      await msg.edit({ components: [row] }).catch(() => {});
    });
  }
};
