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
const { registerGenerateHandlers, sendGenerateMessage } = require('./discord/generate-code');


// === MongoDB Setup ===
const mongoose = require('mongoose');

if (!process.env.MONGO_URI) {
  console.error('❌ MONGO_URI not found in .env!');
  process.exit(1);
}

// Use the simple connect call to avoid deprecated option warnings with modern drivers
mongoose.connect(process.env.MONGO_URI)
  .catch(err => {
    console.error('❌ MongoDB initial connection error:', err);
    // Let the app continue starting; connection errors will also be emitted on mongoose.connection
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

// === Initialize Error Reporter (safe) ===
// Ensure utils/error-reporter.js exists. This init is guarded so it won't crash startup.
// We DO NOT call reporter.report() here because the client may not be ready yet.
// Startup test is performed once the client emits 'ready'.
let reporter;
try {
  const initErrorReporter = require('./utils/error-reporter');
  if (process.env.ERROR_LOG_CHANNEL_ID) {
    reporter = initErrorReporter({
      client,
      channelId: process.env.ERROR_LOG_CHANNEL_ID,
      botName: process.env.ERROR_REPORTER_NAME || 'EndzoneStrike Errors',
      rateLimitMs: 5000
    });
  } else {
    console.warn('⚠️ ERROR_LOG_CHANNEL_ID not set — error reporter not initialized.');
  }
} catch (err) {
  // If require fails (file missing) or init throws, don't crash the bot startup
  console.error('⚠️ Failed to initialize error reporter:', err);
}

// === Load Slash Commands ===
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
  for (const file of fs.readdirSync(commandsPath)) {
    if (file.endsWith('.js')) {
      const command = require(`./commands/${file}`);
      client.commands.set(
        command.data.name || command.data.toJSON().name,
        command
      );
    }
  }
} else {
  console.warn('⚠️ commands directory not found at', commandsPath);
}

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  registerGenerateHandlers(client);
const claimChannelId = process.env.CLAIM_CHANNEL_ID;
if (claimChannelId) {
  sendGenerateMessage(client, claimChannelId).catch(console.error);
}

  // optional: only run the startup test once the client is ready so the reporter can fetch the channel
  if (typeof reporter?.report === 'function') {
    reporter.report('Startup test', 'Error reporter initialized').catch(() => {});
  }

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
          content: `${message.author}, please refrain from pinging users with the **Don't Ping** role. If you continue, you will be moderated by staff.`,
          allowedMentions: { users: [] }
        });
      } else if (count === 2) {
        await message.channel.send({
          content: `${message.author}, this is your second warning. You will be timed out the next time you ping a user with the **Don't Ping** role.`,
          allowedMentions: { users: [] }
        });
      } else if (count >= 3) {
        await message.member.timeout(600_000, 'Repeated pings to protected members').catch(console.error);
        await message.channel.send({
          content: `${message.author}, you have been timed out for repeatedly pinging users with the **Don't Ping** role.`,
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

  // === Handle Shop Purchase Buttons ===
  if (interaction.isButton() && interaction.customId.startsWith('shop_buy_')) {
    const ShopItem = require('./data/models/ShopItem');
    const User = require('./data/models/User');
    const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

    try {
      const itemId = interaction.customId.replace('shop_buy_', '');
      const item = await ShopItem.findById(itemId);
      
      if (!item) {
        return interaction.reply({ content: '❌ Item not found.', ephemeral: true });
      }

      let user = await User.findOne({ discordId: interaction.user.id });
      if (!user) {
        user = await User.create({ discordId: interaction.user.id });
      }

      // Check if user can afford
      if (user.balance < item.price) {
        return interaction.reply({ content: '❌ You cannot afford this item.', ephemeral: true });
      }

      // Check stock
      if (item.stock === 0) {
        return interaction.reply({ content: '❌ This item is out of stock.', ephemeral: true });
      }

      // Show confirmation modal/message
      const confirmEmbed = new EmbedBuilder()
        .setTitle('Confirm Purchase')
        .setDescription(`Are you sure you want to buy **${item.name}** for ${item.price}?`)
        .setColor(0xffaa00);

      const confirmRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`shop_confirm_${itemId}`)
          .setLabel('Confirm')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('shop_cancel')
          .setLabel('Cancel')
          .setStyle(ButtonStyle.Danger)
      );

      await interaction.reply({ embeds: [confirmEmbed], components: [confirmRow], ephemeral: true });
    } catch (err) {
      console.error(err);
      await interaction.reply({ content: 'An error occurred.', ephemeral: true }).catch(() => {});
    }
    return;
  }

  // === Handle Shop Confirmation Buttons ===
  if (interaction.isButton() && interaction.customId.startsWith('shop_confirm_')) {
    const ShopItem = require('./data/models/ShopItem');
    const User = require('./data/models/User');
    const { EmbedBuilder } = require('discord.js');

    try {
      const itemId = interaction.customId.replace('shop_confirm_', '');
      const item = await ShopItem.findById(itemId);
      
      if (!item) {
        return interaction.update({ content: '❌ Item not found.', embeds: [], components: [] });
      }

      let user = await User.findOne({ discordId: interaction.user.id });
      if (!user) {
        return interaction.update({ content: '❌ User not found.', embeds: [], components: [] });
      }

      // Double-check affordability and stock
      if (user.balance < item.price) {
        return interaction.update({ content: '❌ You cannot afford this item.', embeds: [], components: [] });
      }

      if (item.stock === 0) {
        return interaction.update({ content: '❌ This item is out of stock.', embeds: [], components: [] });
      }

      // Check if already owned (for role items)
      let invItem = user.inventory.find(i => i.item === item.name);
      if (item.type === 'role' && invItem && invItem.quantity > 0) {
        return interaction.update({ content: '❌ You already own this item.', embeds: [], components: [] });
      }

      // Update inventory
      if (invItem) {
        invItem.quantity += 1;
      } else {
        user.inventory.push({ item: item.name, quantity: 1 });
      }
      user.balance -= item.price;

      // Update item stock if not unlimited
      if (item.stock > 0) {
        item.stock -= 1;
      }

      await user.save();
      await item.save();

      const successEmbed = new EmbedBuilder()
        .setTitle('✅ Purchase Successful')
        .setDescription(`You bought **${item.name}** for ${item.price}.\nYour new balance: ${user.balance}`)
        .setColor(0x00ff99);

      await interaction.update({ embeds: [successEmbed], components: [] });
    } catch (err) {
      console.error(err);
      await interaction.update({ content: 'An error occurred during purchase.', embeds: [], components: [] }).catch(() => {});
    }
    return;
  }

  // === Handle Shop Cancel Button ===
  if (interaction.isButton() && interaction.customId === 'shop_cancel') {
    await interaction.update({ content: '❌ Purchase cancelled.', embeds: [], components: [] });
    return;
  }

  // === Handle Suggestion Buttons ===
  if (interaction.isButton()) {
    (async () => {
      const [action, suggesterId] = interaction.customId.split('_');
      
      // Only handle suggestion buttons (accept, decline, edit, notes)
      if (!['accept', 'decline', 'edit', 'notes'].includes(action)) {
        return; // Not a suggestion button, ignore
      }
      
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