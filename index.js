// === Required Modules ===
const {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ActivityType
} = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config(); // Loads BOT_TOKEN, etc.

// === MongoDB Setup ===
const mongoose = require('mongoose');

if (!process.env.MONGO_URI) {
  console.error('❌ MONGO_URI not found in .env!');
  process.exit(1);
}

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB connected!');
});
mongoose.connection.on('error', err => {
  console.error('❌ MongoDB connection error:', err);
});

// === Client Setup ===
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel, Partials.Message]
});

client.commands = new Collection();
client.staffList = [];

// === Load Slash Commands ===
const commandsPath = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsPath)) {
  if (file.endsWith('.js')) {
    const command = require(`./commands/${file}`);
    client.commands.set(
      command.data.name || command.data.toJSON().name,
      command
    );
  }
}

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  // ✅ Set Bot Status
  client.user.setPresence({
    status: 'online',
    activities: [
      { name: 'Endzone Strike', type: ActivityType.Playing }
    ]
  });
});

// === Handle Activity Status Request ===
client.on('messageCreate', async (message) => {
  if (
    message.content.toLowerCase().startsWith('set_activity') &&
    message.author.id === process.env.OWNER_ID
  ) {
    // Example: set_activity Playing My New Game
    const args = message.content.split(' ').slice(1);
    const type = args.shift();
    const name = args.join(' ');

    let activityType = ActivityType.Playing;
    if (type && ActivityType[type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()]) {
      activityType = ActivityType[type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()];
    }

    client.user.setPresence({
      status: 'online',
      activities: [{ name, type: activityType }]
    });

    await message.reply(`✅ Activity set to: **${type} ${name}**`);
  }
});

// === NoPing Role Protection with Offense Tracking and Ping Bypass ===
const NO_PING_ROLE_ID = '1396667715132854293'; // Replace with actual @noping role ID
const PING_BYPASS_ROLE_ID = process.env.PING_BYPASS_ROLE_ID;
const offensePath = path.join(__dirname, 'data', 'offenseData.json');

function loadOffenseData() {
  if (!fs.existsSync(offensePath)) return {};
  return JSON.parse(fs.readFileSync(offensePath, 'utf8'));
}

function saveOffenseData(data) {
  fs.writeFileSync(offensePath, JSON.stringify(data, null, 2));
}

function clearOldOffenses(data) {
  const now = Date.now();
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  for (const userId in data) {
    if (now - data[userId].lastOffense > oneWeek) {
      delete data[userId];
    }
  }
  return data;
}

client.on('messageCreate', async (message) => {
  if (
    message.author.bot ||
    !message.guild ||
    !message.mentions.users.size ||
    message.content.startsWith('/')
  ) return;

  // Ignore replies (don't moderate if this message is a reply)
  if (message.type === 19 || message.reference) return;

  const staffRole = message.guild.roles.cache.get(process.env.VERIFIED_STAFF_ROLE_ID);
  const isVerifiedStaff = staffRole && message.member.roles.cache.has(staffRole.id);

  const pingBypassRole = message.guild.roles.cache.get(PING_BYPASS_ROLE_ID);
  const isPingBypass = pingBypassRole && message.member.roles.cache.has(pingBypassRole.id);

  if (isVerifiedStaff || isPingBypass) return;

  for (const [, user] of message.mentions.users) {
    const mentionedMember = await message.guild.members.fetch(user.id).catch(() => null);
    if (!mentionedMember) continue;

    if (mentionedMember.roles.cache.has(NO_PING_ROLE_ID)) {
      await message.delete().catch(console.error);

      // ⏳ Load and clean up offense records
      let offenseData = clearOldOffenses(loadOffenseData());
      const userId = message.author.id;
      const record = offenseData[userId] || { count: 0, lastOffense: 0 };

      record.count += 1;
      record.lastOffense = Date.now();
      offenseData[userId] = record;
      saveOffenseData(offenseData);

      const count = record.count;

      if (count === 1) {
        await message.channel.send({
          content: `${message.author}, please refrain from pinging users with the **Don’t Ping** role. If you continue, you will be moderated by staff.`,
          allowedMentions: { users: [] }
        });
      } else if (count === 2) {
        await message.channel.send({
          content: `${message.author}, this is your second warning. You will be timed out the next time you ping a user with the **Don’t Ping** role.`,
          allowedMentions: { users: [] }
        });
      } else if (count >= 3) {
        await message.member.timeout(600_000, 'Repeated pings to protected members').catch(console.error);
        await message.channel.send({
          content: `${message.author}, you have been timed out for repeatedly pinging users with the **Don’t Ping** role.`,
          allowedMentions: { users: [] }
        });

        // ♻️ Reset their offense record after punishment
        offenseData[userId] = { count: 0, lastOffense: Date.now() };
        saveOffenseData(offenseData);
      }

      break;
    }
  }
});

// === Handle Interactions ===
client.on('interactionCreate', async (interaction) => {
  // === Handle Slash Commands ===
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction, client);
    } catch (err) {
      console.error(err);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: 'An error occurred.' });
      } else {
        await interaction.reply({ content: 'An error occurred.', ephemeral: false });
      }
    }
  }

  // === Handle Suggestion Buttons ===
  if (interaction.isButton()) {
    (async () => {
      const [action, suggesterId] = interaction.customId.split('_');
      const adminRole = interaction.guild.roles.cache.get(process.env.ADMIN_ROLE_ID);

      if (!adminRole) {
        try {
          return await interaction.reply({
            content: '❌ The Administrator role (by ID) could not be found. Check your ADMIN_ROLE_ID in .env.',
            ephemeral: true
          });
        } catch {}
      }

      const memberRoles = interaction.member.roles.cache;
      const hasAdminOrHigher = memberRoles.some(role => role.position >= adminRole.position);

      // Only allow the suggester to edit, otherwise require admin+ role
      const isSuggester = interaction.user.id === suggesterId;
      if (action === 'edit' && !isSuggester) {
        try {
          return await interaction.reply({ content: '❌ Only the suggestion author can edit it.', ephemeral: true });
        } catch {}
      }

      if (['accept', 'decline', 'notes'].includes(action) && !hasAdminOrHigher) {
        try {
          return await interaction.reply({
            content: '❌ Only users with the "Administrator" role or higher can use this.',
            ephemeral: true
          });
        } catch {}
      }

      const embed = interaction.message.embeds[0];
      if (!embed) {
        try {
          return await interaction.reply({
            content: '❌ This suggestion message has no embed to update.',
            ephemeral: true
          });
        } catch (err) {
          if (err.code !== 10062) console.error(err);
          return;
        }
      }
      const updatedEmbed = { ...embed.data };

      if (action === 'accept') {
        updatedEmbed.color = 0x00ff00;
        updatedEmbed.footer = { text: `Accepted by ${interaction.user.tag}` };
        await interaction.update({ embeds: [updatedEmbed], components: [] });

      } else if (action === 'decline') {
        updatedEmbed.color = 0xff0000;
        updatedEmbed.footer = { text: `Declined by ${interaction.user.tag}` };
        await interaction.update({ embeds: [updatedEmbed], components: [] });

      } else if (action === 'edit') {
        const modal = new ModalBuilder()
          .setCustomId(`edit_modal_${interaction.message.id}`)
          .setTitle('Edit Suggestion')
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('suggestion_text')
                .setLabel('New suggestion text')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
            )
          );
        await interaction.showModal(modal);

      } else if (action === 'notes') {
        const modal = new ModalBuilder()
          .setCustomId(`notes_modal_${interaction.message.id}`)
          .setTitle('Staff Notes')
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('note_content')
                .setLabel('Enter a staff note')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
            )
          );
        await interaction.showModal(modal);
      }
    })();
  }

  // === Handle Modals ===
  if (interaction.isModalSubmit()) {
    // ✅ Staff Update Modal Handler
    if (interaction.customId === 'staff_update_modal') {
      const staffUpdate = require('./commands/staffupdate');
      return staffUpdate.handleModal(interaction);
    }

    if (interaction.customId.startsWith('edit_modal') || interaction.customId.startsWith('notes_modal')) {
      const messageId = interaction.customId.split('_').pop();
      const message = await interaction.channel.messages.fetch(messageId);
      const embed = message.embeds[0];
      if (!embed) {
        return interaction.reply({ content: '❌ No embed to update.', ephemeral: true });
      }
      const updatedEmbed = { ...embed.data };

      if (interaction.customId.startsWith('edit_modal')) {
        const newText = interaction.fields.getTextInputValue('suggestion_text');
        updatedEmbed.description = newText;
        await message.edit({ embeds: [updatedEmbed] });
        return interaction.reply({ content: '✅ Suggestion updated.', ephemeral: true });
      }

      if (interaction.customId.startsWith('notes_modal')) {
        const note = interaction.fields.getTextInputValue('note_content');
        updatedEmbed.fields = updatedEmbed.fields || [];
        updatedEmbed.fields.push({ name: 'Staff Note', value: note });
        await message.edit({ embeds: [updatedEmbed] });
        return interaction.reply({ content: '✅ Note added.', ephemeral: true });
      }
    }

    // ✅ Verified Staff Modal Handler
    if (interaction.customId.startsWith('staff_')) {
      const staffManage = require('./commands/staffmanage');
      await staffManage.handleModal(interaction);
    }
  }
});

// === Login ===
if (!process.env.BOT_TOKEN) {
  console.error('❌ BOT_TOKEN not found in .env!');
  process.exit(1);
}
client.login(process.env.BOT_TOKEN);