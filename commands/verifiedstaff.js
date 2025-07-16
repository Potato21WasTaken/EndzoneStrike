const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  time
} = require('discord.js');
const fs = require('fs');
const path = require('path');

const staffFile = path.join(__dirname, '..', 'data', 'staff.json');

// Helper to calculate age from DOB string (MM/DD/YYYY)
function calculateAge(dobString) {
  const [month, day, year] = dobString.split('/').map(Number);
  const dob = new Date(year, month - 1, day);
  const today = new Date();

  let age = today.getFullYear() - dob.getFullYear();
  const birthdayPassed =
    today.getMonth() > dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());

  return birthdayPassed ? age : age - 1;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verifiedstaff')
    .setDescription('📋 View verified staff (Admins and above only).')
    .setDefaultMemberPermissions(PermissionFlagsBits.ViewAuditLog),

  async execute(interaction) {
    const adminRole = interaction.guild.roles.cache.get(process.env.ADMIN_ROLE_ID);
    if (!adminRole) {
      return interaction.reply({
        content: '❌ ADMIN_ROLE_ID not found. Check your .env setup.',
        ephemeral: true
      });
    }

    const hasAccess = interaction.member.roles.cache.some(
      role => role.position >= adminRole.position
    );

    if (!hasAccess) {
      return interaction.reply({
        content: '❌ You do not have permission to use this command.',
        ephemeral: true
      });
    }

    // Load and validate staff list
    let staffList = [];
    try {
      if (fs.existsSync(staffFile)) {
        const rawData = fs.readFileSync(staffFile, 'utf-8');
      const parsed = JSON.parse(rawData);
      if (Array.isArray(parsed.staff)) {
        staffList = parsed.staff;
      } else {
        throw new Error('staff.json.staff is not an array.');
      }
    }
    } catch (err) {
      console.error('❌ Failed to load staff.json:', err);
      return interaction.reply({
        content: '⚠️ Failed to read staff data.',
        ephemeral: true
      });
    }

    if (staffList.length === 0) {
      return interaction.reply({
        content: '📭 No verified staff found.',
        ephemeral: true
      });
    }

    // Sort alphabetically by username
    staffList.sort((a, b) => a.username.localeCompare(b.username));

    // Paginate: group into chunks of 5
    const chunked = [];
    for (let i = 0; i < staffList.length; i += 5) {
      chunked.push(staffList.slice(i, i + 5));
    }

    const totalPages = chunked.length;
    let currentPage = 0;

    const buildPage = async (index) => {
      const embeds = [];

      for (const staff of chunked[index]) {
        let user;
        try {
          user = await interaction.client.users.fetch(staff.discordId);
        } catch (err) {
          console.warn(`Failed to fetch user ${staff.discordId}:`, err);
          user = null;
        }

        const accountCreated = user ? time(user.createdAt, 'F') : 'Unknown';
        const accountAge = user ? time(user.createdAt, 'R') : 'Unknown';
        const age = staff.dob ? calculateAge(staff.dob) : 'Unknown';

        const embed = new EmbedBuilder()
          .setColor(0x00bfff)
          .setTitle(`${staff.username} — ${staff.rank}`)
          .addFields(
            { name: '🆔 Discord ID', value: staff.discordId, inline: true },
            { name: '🎂 Age', value: `${age}`, inline: true },
            { name: '📆 DOB', value: staff.dob || 'Unknown', inline: true },
            { name: '📅 Hired On', value: staff.hired || 'Unknown', inline: true },
            { name: '📤 Account Created', value: `${accountCreated} (${accountAge})`, inline: false }
          );
        embeds.push(embed);
      }

      return embeds;
    };

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('prev_page')
        .setLabel('⬅️ Prev')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId('next_page')
        .setLabel('➡️ Next')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(totalPages <= 1)
    );

    const embeds = await buildPage(currentPage);

    await interaction.reply({
      content: `📄 Page ${currentPage + 1} of ${totalPages}`,
      embeds,
      components: [row],
      ephemeral: false
    });

    const msg = await interaction.fetchReply();

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 120_000
    });

    collector.on('collect', async (btnInteraction) => {
      if (btnInteraction.user.id !== interaction.user.id) {
        return btnInteraction.reply({ content: '❌ Not for you.', ephemeral: true });
      }

      if (btnInteraction.customId === 'prev_page' && currentPage > 0) currentPage--;
      if (btnInteraction.customId === 'next_page' && currentPage < totalPages - 1) currentPage++;

      const embeds = await buildPage(currentPage);

      row.components[0].setDisabled(currentPage === 0);
      row.components[1].setDisabled(currentPage === totalPages - 1);

      await btnInteraction.update({
        content: `📄 Page ${currentPage + 1} of ${totalPages}`,
        embeds,
        components: [row]
      });
    });

collector.on('end', async () => {
  row.components.forEach(btn => btn.setDisabled(true));
  try {
    await msg.edit({ components: [row] });
  } catch (error) {
    console.warn('⚠️ Could not edit message after collector ended:', error);
    // Optional: silently fail or notify you in logs
  }
  });

  }
};
