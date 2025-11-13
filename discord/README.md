# Discord Code Generation Module

This module provides Discord integration for generating unique codes that can be redeemed in Roblox.

## Features

- **Slash Command**: `/generate-code` - Users can generate codes via slash command
- **Button Interface**: Interactive button to generate codes
- **DM Delivery**: Codes are sent via DM (with fallback to ephemeral messages)
- **Error Handling**: Gracefully handles closed DMs and backend errors

## Installation

### 1. Environment Variables

Add the following to your `.env` file in the root directory:

```env
# Backend API URL (where the backend server is running)
BACKEND_URL=http://localhost:3000

# Bot secret for authenticating with the backend
# This should match the BOT_SECRET in the backend .env
BOT_SECRET=your-bot-secret-here

# Optional: Channel ID where you want to post the generate message
CLAIM_CHANNEL_ID=1234567890123456789
```

### 2. Register the Module

In your main bot file (e.g., `index.js`), add the following:

```javascript
// At the top with other requires
const { registerGenerateHandlers, sendGenerateMessage } = require('./discord/generate-code');

// After client is ready, register handlers
client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  
  // Register code generation handlers
  registerGenerateHandlers(client);
  
  // Optional: Send the generate message to a specific channel
  // You can call this once or whenever you want to create a new button
  const claimChannelId = process.env.CLAIM_CHANNEL_ID;
  if (claimChannelId) {
    sendGenerateMessage(client, claimChannelId)
      .then(() => console.log('✅ Generate message sent'))
      .catch(err => console.error('❌ Failed to send generate message:', err));
  }
});
```

### 3. Deploy the Slash Command

Add the command to your command deployment script. If you have a `deploy-commands.js` file:

```javascript
const { generateCommand } = require('./discord/generate-code');

const commands = [
  // ... your existing commands
  generateCommand.data.toJSON(),
];
```

Then run:
```bash
node deploy-commands.js
```

## Usage

### For Users

**Option 1: Slash Command**
1. Type `/generate-code` in any channel
2. The bot will send you a DM with your unique code
3. If DMs are closed, the code will be sent as an ephemeral message (only visible to you)

**Option 2: Button**
1. Click the "Generate Code" button in the designated channel
2. Same DM/ephemeral behavior as the slash command

### For Administrators

**Send a Generate Message:**
```javascript
const { sendGenerateMessage } = require('./discord/generate-code');

// In an async context
await sendGenerateMessage(client, 'your-channel-id-here');
```

This creates an embedded message with a button that users can click to generate codes.

## API Reference

### `registerGenerateHandlers(client)`

Registers all necessary interaction handlers for code generation.

**Parameters:**
- `client` (Client) - Discord.js client instance

**Example:**
```javascript
const { registerGenerateHandlers } = require('./discord/generate-code');
registerGenerateHandlers(client);
```

### `sendGenerateMessage(client, channelId)`

Sends an embedded message with a button to generate codes.

**Parameters:**
- `client` (Client) - Discord.js client instance
- `channelId` (string) - ID of the channel to send the message to

**Returns:** Promise<void>

**Example:**
```javascript
const { sendGenerateMessage } = require('./discord/generate-code');
await sendGenerateMessage(client, '1234567890123456789');
```

### `generateCommand`

The slash command data object. Use this if you need to access the command definition.

**Example:**
```javascript
const { generateCommand } = require('./discord/generate-code');
console.log(generateCommand.data.name); // 'generate-code'
```

## Error Handling

The module handles several error scenarios:

1. **Closed DMs**: If a user has DMs disabled, the code is sent as an ephemeral message
2. **Backend Errors**: If the backend is unavailable, an error message is shown
3. **Authentication Errors**: If BOT_SECRET is missing or invalid, a configuration error is shown

## Security Notes

- Codes are sent via DM when possible to keep them private
- Ephemeral messages are used as fallback (only visible to the requesting user)
- BOT_SECRET is required to prevent unauthorized code generation
- All backend communication uses secure headers

## Troubleshooting

### "Bot is not configured properly"
- Ensure `BOT_SECRET` is set in your `.env` file
- Verify it matches the `BOT_SECRET` in the backend `.env`

### "Failed to generate code: HTTP 403"
- The backend rejected the authentication
- Check that BOT_SECRET matches between Discord bot and backend

### "Failed to generate code: fetch failed"
- The backend is not running or unreachable
- Verify `BACKEND_URL` is correct and the backend is running
- Check that the backend is accessible from the bot's network

### Slash command not appearing
- Make sure you've deployed the command with `deploy-commands.js`
- Wait a few minutes for Discord to sync the commands
- Try using the command in a DM with the bot first

### Button not working
- Ensure `registerGenerateHandlers(client)` is called before the bot receives interactions
- Check the console for any error messages
- Verify the interaction handler is not being overridden elsewhere

## Examples

### Full Integration Example

```javascript
// index.js
const { Client, GatewayIntentBits } = require('discord.js');
const { registerGenerateHandlers, sendGenerateMessage } = require('./discord/generate-code');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
  ],
});

client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  
  // Register code generation handlers
  registerGenerateHandlers(client);
  
  // Optionally send generate message
  const channelId = process.env.CLAIM_CHANNEL_ID;
  if (channelId) {
    try {
      await sendGenerateMessage(client, channelId);
      console.log('✅ Generate message sent');
    } catch (error) {
      console.error('❌ Failed to send generate message:', error);
    }
  }
});

client.login(process.env.BOT_TOKEN);
```

### Command Deployment Example

```javascript
// deploy-commands.js
const { REST, Routes } = require('discord.js');
const { generateCommand } = require('./discord/generate-code');
require('dotenv').config();

const commands = [
  generateCommand.data.toJSON(),
  // ... other commands
];

const rest = new REST().setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands },
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();
```

## Dependencies

This module requires:
- `discord.js` v14+
- Node.js 18+
- Running backend API server

The module uses the native `fetch` API available in Node.js 18+, so no additional fetch library is needed.
