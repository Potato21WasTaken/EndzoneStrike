const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  PermissionFlagsBits
} = require('discord.js');

const fs = require('fs');
const path = require('path');

const staffFile = path.join(__dirname, '..', 'data', 'staff.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staffupdate')
    .setDescription('✏️ Update an existing staff entry.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const modal = new ModalBuilder()
      .setCustomId('staff_update_modal')
      .setTitle('Update Staff Entry')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('discord_id')
            .setLabel('Discord User ID')
            .setPlaceholder('e.g., 123456789012345678')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('new_username')
            .setLabel('New Username (leave blank to skip)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('new_rank')
            .setLabel('New Rank (leave blank to skip)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('new_dob')
            .setLabel('New DOB (MM/DD/YYYY - optional)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('new_hired')
            .setLabel('New Hire Date (e.g., Jan 2024)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
        )
      );

    await interaction.showModal(modal);
  },

  async handleModal(interaction) {
    const id = interaction.fields.getTextInputValue('discord_id').trim();
    const username = interaction.fields.getTextInputValue('new_username').trim();
    const rank = interaction.fields.getTextInputValue('new_rank').trim();
    const dob = interaction.fields.getTextInputValue('new_dob').trim();
    const hired = interaction.fields.getTextInputValue('new_hired').trim();

    let data;
    try {
      data = fs.existsSync(staffFile)
        ? JSON.parse(fs.readFileSync(staffFile, 'utf-8'))
        : { staff: [] };
    } catch (err) {
      console.error('❌ Failed to load staff file:', err);
      return interaction.reply({ content: 'Error reading staff file.', ephemeral: true });
    }

    const staff = data.staff.find(s => s.discordId === id);
    if (!staff) {
      return interaction.reply({ content: 'Staff member not found.', ephemeral: true });
    }

    const changes = [];
    if (username) {
      changes.push(`Username: \`${staff.username}\` → \`${username}\``);
      staff.username = username;
    }
    if (rank) {
      changes.push(`Rank: \`${staff.rank}\` → \`${rank}\``);
      staff.rank = rank;
    }
    if (dob) {
      changes.push(`DOB: \`${staff.dob || 'N/A'}\` → \`${dob}\``);
      staff.dob = dob;
    }
    if (hired) {
      changes.push(`Hired: \`${staff.hired || 'N/A'}\` → \`${hired}\``);
      staff.hired = hired;
    }

    try {
      fs.writeFileSync(staffFile, JSON.stringify(data, null, 2));
    } catch (err) {
      console.error('❌ Failed to save staff file:', err);
      return interaction.reply({ content: 'Failed to update staff list.', ephemeral: true });
    }

    await interaction.reply({ content: '✅ Staff member updated.', ephemeral: true });

    // Send log embed if changes were made
    if (changes.length > 0 && process.env.MODLOG_CHANNEL_ID) {
      const logChannel = interaction.guild.channels.cache.get(process.env.MODLOG_CHANNEL_ID);
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setTitle('📥 Staff Entry Updated')
          .setColor(0xffcc00)
          .setDescription(`**Staff ID:** ${id}\n${changes.join('\n')}`)
          .setFooter({ text: `Updated by ${interaction.user.tag}` })
          .setTimestamp();

        logChannel.send({ embeds: [logEmbed] });
      }
    }
  }
};
