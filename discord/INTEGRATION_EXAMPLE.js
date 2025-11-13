// Example Integration File for Discord Code Generation
// This file shows how to integrate the generate-code module into index.js

// ============================================
// STEP 1: Add this to your .env file
// ============================================
/*
BACKEND_URL=http://localhost:3000
BOT_SECRET=your-bot-secret-here
CLAIM_CHANNEL_ID=1234567890123456789
*/

// ============================================
// STEP 2: Require the module at the top of index.js
// ============================================
const { registerGenerateHandlers, sendGenerateMessage } = require('./discord/generate-code');

// ============================================
// STEP 3: Register handlers after client is ready
// ============================================
// Add this inside your client.once('ready', () => { ... }) block

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  
  // Existing bot status code...
  client.user.setPresence({
    status: 'online',
    activities: [
      { name: 'Endzone Strike', type: ActivityType.Playing }
    ]
  });
  
  // ✅ NEW: Register code generation handlers
  registerGenerateHandlers(client);
  
  // ✅ NEW: Optional - Send the generate button message to a channel
  const claimChannelId = process.env.CLAIM_CHANNEL_ID;
  if (claimChannelId) {
    sendGenerateMessage(client, claimChannelId)
      .then(() => console.log('✅ Generate code message sent'))
      .catch(err => console.error('❌ Failed to send generate message:', err));
  }
});

// ============================================
// STEP 4: Deploy the slash command
// ============================================
// In deploy-commands.js, add this:

const { generateCommand } = require('./discord/generate-code');

const commands = [
  // ... your existing commands
  generateCommand.data.toJSON(),
];

// Then run: node deploy-commands.js

// ============================================
// NOTES
// ============================================
/*
1. The registerGenerateHandlers function will:
   - Register the /generate-code slash command
   - Add a button handler for the "Generate Code" button
   - Handle both DMs and ephemeral messages

2. The sendGenerateMessage function will:
   - Post an embed with a button in the specified channel
   - Users can click the button to generate codes

3. Environment variables required:
   - BACKEND_URL: Where your backend API is hosted
   - BOT_SECRET: Shared secret between bot and backend (must match)
   - CLAIM_CHANNEL_ID: (Optional) Channel to post the generate button

4. Backend must be running for the bot to generate codes
   - See backend/README.md for setup instructions

5. The module gracefully handles:
   - Closed DMs (falls back to ephemeral messages)
   - Backend errors (shows user-friendly error messages)
   - Authentication failures (logs for admin debugging)
*/
