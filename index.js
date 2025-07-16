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
    client.commands.set(command.data.name, command);
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
    message.content.trim().toLowerCase() === 'activity_status' &&
    message.mentions.has(client.user) &&
    message.author.id === process.env.OWNER_ID // ✅ Secure: only you
  ) {
    const activity = client.user.presence?.activities?.[0];

    if (activity) {
      await message.reply(`📊 Current activity: **${activity.type} ${activity.name}**`);
    } else {
      await message.reply('ℹ️ No activity is currently set.');
    }
  }
});


// === Handle Interactions ===
client.on('interactionCreate', async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction, client);
    } catch (err) {
      console.error(err);
      await interaction.reply({ content: 'An error occurred.', ephemeral: true });
    }
  }

 if (interaction.isButton()) {
  (async () => {
    const [action, suggesterId] = interaction.customId.split('_');

    // 🔐 Role-based permission check
// 🔐 Role-based permission check
const adminRole = interaction.guild.roles.cache.get(process.env.ADMIN_ROLE_ID); // use ID for reliability

if (!adminRole) {
  return interaction.reply({
    content: '❌ The Administrator role (by ID) could not be found. Check your ADMIN_ROLE_ID in .env.',
    ephemeral: true
  });
}

const memberRoles = interaction.member.roles.cache;
const hasAdminOrHigher = memberRoles.some(role => role.position >= adminRole.position);

// 🧾 Only allow the suggester to edit, otherwise require admin+ role
const isSuggester = interaction.user.id === suggesterId;
if (action === 'edit' && !isSuggester) {
  return interaction.reply({ content: '❌ Only the suggestion author can edit it.', ephemeral: true });
}

if (['accept', 'decline', 'notes'].includes(action) && !hasAdminOrHigher) {
  return interaction.reply({
    content: '❌ Only users with the "Administrator" role or higher can use this.',
    ephemeral: true
  });
}

    const embed = interaction.message.embeds[0];
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
client.login(process.env.BOT_TOKEN);


