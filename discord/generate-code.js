const { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} = require('discord.js');

/**
 * Discord Code Generation Module
 * 
 * This module provides functionality to generate unique codes for Discord users
 * that can be redeemed in Roblox for rewards.
 */

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const BOT_SECRET = process.env.BOT_SECRET;

/**
 * Fetches data from the backend API
 * @param {string} endpoint - API endpoint
 * @param {object} options - Fetch options
 * @returns {Promise<object>} Response data
 */
async function fetchBackend(endpoint, options = {}) {
  const response = await fetch(`${BACKEND_URL}${endpoint}`, options);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || `HTTP ${response.status}: ${data.error}`);
  }
  
  return data;
}

/**
 * Create a slash command for code generation
 */
const generateCommand = {
  data: new SlashCommandBuilder()
    .setName('generate-code')
    .setDescription('Generate a unique code to link your Discord account with Roblox'),

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      if (!BOT_SECRET) {
        return await interaction.editReply({
          content: '❌ Bot is not configured properly. Please contact an administrator.',
        });
      }

      // Request code from backend
      const { code } = await fetchBackend('/create-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-bot-key': BOT_SECRET,
        },
        body: JSON.stringify({
          discordId: interaction.user.id,
          length: 8,
        }),
      });

      // Try to DM the user
      try {
        const dmEmbed = new EmbedBuilder()
          .setTitle('🎮 Your Code is Ready!')
          .setDescription(
            `Your unique code is: **${code}**\n\n` +
            '**How to redeem:**\n' +
            '1. Join the Roblox game\n' +
            '2. Open the redemption menu\n' +
            '3. Enter your code\n' +
            '4. Enjoy your rewards!\n\n' +
            '⚠️ **This code can only be used once.**'
          )
          .setColor(0x00ff99)
          .setFooter({ text: 'Code expires in 30 days' })
          .setTimestamp();

        await interaction.user.send({ embeds: [dmEmbed] });

        // Confirm in channel
        await interaction.editReply({
          content: '✅ Check your DMs! I\'ve sent you your unique code.',
        });
      } catch (dmError) {
        // DMs are closed, send code in ephemeral message
        console.warn(`Failed to DM user ${interaction.user.id}:`, dmError.message);

        const embed = new EmbedBuilder()
          .setTitle('🎮 Your Code is Ready!')
          .setDescription(
            `Your unique code is: **${code}**\n\n` +
            '**How to redeem:**\n' +
            '1. Join the Roblox game\n' +
            '2. Open the redemption menu\n' +
            '3. Enter your code\n' +
            '4. Enjoy your rewards!\n\n' +
            '⚠️ **This code can only be used once.**\n\n' +
            '💡 *Enable DMs from this server to receive codes privately in the future.*'
          )
          .setColor(0xffa500)
          .setFooter({ text: 'Code expires in 30 days' })
          .setTimestamp();

        await interaction.editReply({
          content: '⚠️ I couldn\'t DM you, so here\'s your code (only visible to you):',
          embeds: [embed],
        });
      }
    } catch (error) {
      console.error('Error generating code:', error);

      const errorMessage = error.message.includes('403')
        ? '❌ Backend authentication failed. Please contact an administrator.'
        : `❌ Failed to generate code: ${error.message}`;

      if (interaction.deferred) {
        await interaction.editReply({ content: errorMessage });
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    }
  },
};

/**
 * Button handler for code generation
 */
async function handleGenerateButton(interaction) {
  try {
    await interaction.deferReply({ ephemeral: true });

    if (!BOT_SECRET) {
      return await interaction.editReply({
        content: '❌ Bot is not configured properly. Please contact an administrator.',
      });
    }

    // Request code from backend
    const { code } = await fetchBackend('/create-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-bot-key': BOT_SECRET,
      },
      body: JSON.stringify({
        discordId: interaction.user.id,
        length: 8,
      }),
    });

    // Try to DM the user
    try {
      const dmEmbed = new EmbedBuilder()
        .setTitle('🎮 Your Code is Ready!')
        .setDescription(
          `Your unique code is: **${code}**\n\n` +
          '**How to redeem:**\n' +
          '1. Join the Roblox game\n' +
          '2. Open the redemption menu\n' +
          '3. Enter your code\n' +
          '4. Enjoy your rewards!\n\n' +
          '⚠️ **This code can only be used once.**'
        )
        .setColor(0x00ff99)
        .setFooter({ text: 'Code expires in 30 days' })
        .setTimestamp();

      await interaction.user.send({ embeds: [dmEmbed] });

      await interaction.editReply({
        content: '✅ Check your DMs! I\'ve sent you your unique code.',
      });
    } catch (dmError) {
      console.warn(`Failed to DM user ${interaction.user.id}:`, dmError.message);

      const embed = new EmbedBuilder()
        .setTitle('🎮 Your Code is Ready!')
        .setDescription(
          `Your unique code is: **${code}**\n\n` +
          '**How to redeem:**\n' +
          '1. Join the Roblox game\n' +
          '2. Open the redemption menu\n' +
          '3. Enter your code\n' +
          '4. Enjoy your rewards!\n\n' +
          '⚠️ **This code can only be used once.**\n\n' +
          '💡 *Enable DMs from this server to receive codes privately in the future.*'
        )
        .setColor(0xffa500)
        .setFooter({ text: 'Code expires in 30 days' })
        .setTimestamp();

      await interaction.editReply({
        content: '⚠️ I couldn\'t DM you, so here\'s your code (only visible to you):',
        embeds: [embed],
      });
    }
  } catch (error) {
    console.error('Error generating code:', error);

    const errorMessage = error.message.includes('403')
      ? '❌ Backend authentication failed. Please contact an administrator.'
      : `❌ Failed to generate code: ${error.message}`;

    if (interaction.deferred) {
      await interaction.editReply({ content: errorMessage });
    } else {
      await interaction.reply({ content: errorMessage, ephemeral: true });
    }
  }
}

/**
 * Register interaction handlers for code generation
 * Call this function in your bot's interactionCreate event
 * 
 * @param {Client} client - Discord.js client instance
 */
function registerGenerateHandlers(client) {
  // Register the slash command
  if (!client.commands.has('generate-code')) {
    client.commands.set('generate-code', generateCommand);
  }

  // Add button handler to existing interaction handler
  const originalHandler = client.listeners('interactionCreate')[0];
  
  client.removeAllListeners('interactionCreate');
  
  client.on('interactionCreate', async (interaction) => {
    // Handle generate button
    if (interaction.isButton() && interaction.customId === 'generate_code_button') {
      return await handleGenerateButton(interaction);
    }

    // Handle generate slash command
    if (interaction.isChatInputCommand() && interaction.commandName === 'generate-code') {
      return await generateCommand.execute(interaction);
    }

    // Call original handler for other interactions
    if (originalHandler) {
      await originalHandler(interaction);
    }
  });

  console.log('✅ Code generation handlers registered');
}

/**
 * Send a message with a button to generate codes
 * 
 * @param {Client} client - Discord.js client instance
 * @param {string} channelId - Channel ID to send the message to
 */
async function sendGenerateMessage(client, channelId) {
  try {
    const channel = await client.channels.fetch(channelId);
    
    if (!channel || !channel.isTextBased()) {
      throw new Error('Invalid channel or channel is not text-based');
    }

    const embed = new EmbedBuilder()
      .setTitle('🎮 Link Your Discord with Roblox')
      .setDescription(
        'Click the button below to generate a unique code that links your Discord account with your Roblox account.\n\n' +
        '**Benefits:**\n' +
        '• Unlock exclusive in-game rewards\n' +
        '• Sync your progress across platforms\n' +
        '• Get special Discord roles based on in-game achievements\n\n' +
        '**How it works:**\n' +
        '1. Click the button below\n' +
        '2. Receive your unique code via DM\n' +
        '3. Redeem the code in Roblox\n' +
        '4. Enjoy your rewards!'
      )
      .setColor(0x5865f2)
      .setFooter({ text: 'Each code can only be used once' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('generate_code_button')
        .setLabel('Generate Code')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🎟️')
    );

    await channel.send({
      embeds: [embed],
      components: [row],
    });

    console.log(`✅ Generate code message sent to channel ${channelId}`);
  } catch (error) {
    console.error('Error sending generate message:', error);
    throw error;
  }
}

module.exports = {
  generateCommand,
  registerGenerateHandlers,
  sendGenerateMessage,
};
