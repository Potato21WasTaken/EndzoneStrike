const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const STAFF_FILE = path.join(__dirname, '..', 'data', 'staff.json');
const PERMS_ROLE_ID = process.env.PERMS_ROLE_ID;
const LOG_CHANNEL_ID = '1395118054043684966'; // ✅ Replace with your actual log channel ID


function calculateAge(dobMMDDYYYY) {
  const [month, day, year] = dobMMDDYYYY.split('/').map(Number);
  const birth = new Date(year, month - 1, day);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
  ) {
    age--;
  }
  return age;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staffmanage')
    .setDescription('Add or remove verified staff')
    .addSubcommand(sub =>
      sub.setName('add').setDescription('Add a new staff member')
    )
    .addSubcommand(sub =>
      sub.setName('remove').setDescription('Remove a staff member')
    ),

  async execute(interaction) {
    if (!interaction.member.roles.cache.has(PERMS_ROLE_ID)) {
      return interaction.reply({
        content: '❌ You lack the required role to manage staff.',
        ephemeral: true
      });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'add') {
      const modal = new ModalBuilder()
        .setCustomId('staff_add_modal')
        .setTitle('Add Verified Staff')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('username').setLabel('Staff Username').setStyle(TextInputStyle.Short).setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('discordId').setLabel('Discord ID').setStyle(TextInputStyle.Short).setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('dob').setLabel('Date of Birth (MM/DD/YYYY)').setStyle(TextInputStyle.Short).setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('rank').setLabel('Rank/Position').setStyle(TextInputStyle.Short).setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('hired').setLabel('Date Hired (MM/DD/YYYY)').setStyle(TextInputStyle.Short).setRequired(true)
          )
        );
      return interaction.showModal(modal);
    }

    if (sub === 'remove') {
      const modal = new ModalBuilder()
        .setCustomId('staff_remove_modal')
        .setTitle('Remove Verified Staff')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('username').setLabel('Removing Username').setStyle(TextInputStyle.Short).setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('discordId').setLabel('Discord ID').setStyle(TextInputStyle.Short).setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('hired').setLabel('Date Hired').setStyle(TextInputStyle.Short).setRequired(true)
          )
        );
      return interaction.showModal(modal);
    }
  },

  async handleModal(interaction) {
    let data;
    try {
      const raw = fs.readFileSync(STAFF_FILE, 'utf8');
      data = JSON.parse(raw);
      if (!Array.isArray(data.staff)) data.staff = [];
    } catch (err) {
      console.warn('⚠️ staff.json missing or malformed. Initializing default structure.');
      data = { staff: [] };
    }

    const modalId = interaction.customId;
    const logChannel = interaction.guild.channels.cache.get(LOG_CHANNEL_ID);

    if (modalId === 'staff_add_modal') {
      const fields = interaction.fields;
      const dob = fields.getTextInputValue('dob');

      if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dob)) {
        return interaction.reply({
          content: '❌ Invalid DOB format. Please use MM/DD/YYYY.',
          ephemeral: true
        });
      }

      const age = calculateAge(dob);
      const entry = {
        username: fields.getTextInputValue('username'),
        discordId: fields.getTextInputValue('discordId'),
        age,
        dob,
        rank: fields.getTextInputValue('rank'),
        hired: fields.getTextInputValue('hired'),
        accountCreated: Date.now()
      };

      data.staff.push(entry);

      try {
        fs.writeFileSync(STAFF_FILE, JSON.stringify(data, null, 2));
        await interaction.reply({ content: '✅ Staff member added.', ephemeral: true });

        if (logChannel) {
          const logEmbed = new EmbedBuilder()
            .setTitle('📥 Staff Added')
            .setColor(0x57f287)
            .addFields(
              { name: 'Added By', value: `<@${interaction.user.id}>`, inline: true },
              { name: 'Username', value: entry.username, inline: true },
              { name: 'Discord ID', value: entry.discordId, inline: true },
              { name: 'DOB', value: entry.dob, inline: true },
              { name: 'Rank', value: entry.rank, inline: true },
              { name: 'Hired', value: entry.hired, inline: true }
            )
            .setTimestamp();
          await logChannel.send({ embeds: [logEmbed] });
        }
      } catch (err) {
        console.error('❌ Failed to write staff file:', err);
        return interaction.reply({ content: '❌ Error saving data.', ephemeral: true });
      }
    }

    if (modalId === 'staff_remove_modal') {
      const fields = interaction.fields;
      const id = fields.getTextInputValue('discordId');
      const username = fields.getTextInputValue('username');

      const before = data.staff.length;
      data.staff = data.staff.filter(e => e.discordId !== id);

      try {
        fs.writeFileSync(STAFF_FILE, JSON.stringify(data, null, 2));
        const removed = before !== data.staff.length;

        await interaction.reply({
          content: removed ? '✅ Staff removed.' : '❌ No matching entry found.',
          ephemeral: true
        });

        if (removed && logChannel) {
          const logEmbed = new EmbedBuilder()
            .setTitle('📤 Staff Removed')
            .setColor(0xed4245)
            .addFields(
              { name: 'Removed By', value: `<@${interaction.user.id}>`, inline: true },
              { name: 'Username', value: username, inline: true },
              { name: 'Discord ID', value: id, inline: true }
            )
            .setTimestamp();
          await logChannel.send({ embeds: [logEmbed] });
        }
      } catch (err) {
        console.error('❌ Failed to write staff file:', err);
        return interaction.reply({ content: '❌ Error saving data.', ephemeral: true });
      }
    }
  }
};
