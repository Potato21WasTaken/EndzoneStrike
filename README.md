# EndzoneStrike2

A Discord bot with economy system, fun minigames, and Discord-Roblox code generation!

## Features

### 🎮 Minigames
Play exciting minigames to earn money! See [MINIGAMES.md](MINIGAMES.md) for details.

**Interactive Strategy Games:**
- `/minefield` - Navigate through mines, cash out to win
- `/memory` - Match emoji pairs for rewards
- `/connect4` - Player vs player Connect 4

**Quick Gambling Games:**
- `/trivia` - Answer trivia questions
- `/guessnumber` - Number guessing with betting
- `/diceroll` - Roll dice and win
- `/rps` - Rock-Paper-Scissors
- `/slots` - Slot machine gambling

### 💰 Economy System
- `/balance` - Check your balance
- `/daily` - Claim daily rewards
- `/work` - Work to earn money with job streaks
- `/coinflip` - 50/50 coin flip gambling
- `/shop` - Button-based shop with ownership status
- `/pay` - Send money to others

### 🎯 Other Features
- Aura system
- Staff management
- Suggestion system
- And more!

For detailed minigame information, check [MINIGAMES.md](MINIGAMES.md)

## Discord Code Generation & Roblox Redemption

This repository includes a complete system for generating unique codes in Discord that can be redeemed in Roblox for rewards.

### Features

- **Discord Bot Integration**: Users can generate codes via slash commands or interactive buttons
- **Backend API**: Secure REST API for code creation and redemption
- **Roblox Integration**: Ready-to-use Lua module for code redemption in Roblox games
- **Security**: Header-based authentication and one-time use codes
- **Flexible**: Customizable code length and reward structure

### Quick Start

#### 1. Backend Setup

```bash
cd backend
npm install
```

Create `backend/.env`:
```env
PORT=3000
BOT_SECRET=your-random-bot-secret
SERVER_SECRET=your-random-server-secret
```

Start the backend:
```bash
npm start
```

#### 2. Discord Bot Integration

Add to your main `.env` file:
```env
BACKEND_URL=http://localhost:3000
BOT_SECRET=same-as-backend-bot-secret
CLAIM_CHANNEL_ID=your-channel-id-here
```

In your `index.js`, add:
```javascript
const { registerGenerateHandlers, sendGenerateMessage } = require('./discord/generate-code');

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  
  // Register code generation handlers
  registerGenerateHandlers(client);
  
  // Optional: Send the generate button message
  const claimChannelId = process.env.CLAIM_CHANNEL_ID;
  if (claimChannelId) {
    sendGenerateMessage(client, claimChannelId)
      .catch(err => console.error('Failed to send generate message:', err));
  }
});
```

Deploy the slash command:
```javascript
// In deploy-commands.js
const { generateCommand } = require('./discord/generate-code');

const commands = [
  // ... your existing commands
  generateCommand.data.toJSON(),
];
```

#### 3. Roblox Integration

1. Enable HTTP Requests in Game Settings → Security
2. Add `roblox/RedemptionService.lua` to your game as a ModuleScript
3. Initialize in a server script:

```lua
local RedemptionService = require(game.ServerScriptService.RedemptionService)

RedemptionService.Initialize(
  "https://your-backend.com",  -- Your backend URL
  "your-server-secret"         -- SERVER_SECRET from backend .env
)

-- Example: Redeem a code
RedemptionService.RedeemCode(player, code)
  :andThen(function(reward)
    RedemptionService.GiveRewards(player, reward)
    -- Notify player of success
  end)
  :catch(function(error)
    -- Notify player of error
  end)
```

### Documentation

- **[Backend API Documentation](backend/README.md)** - API endpoints, setup, and testing
- **[Discord Module Documentation](discord/README.md)** - Discord bot integration and usage
- **[Roblox Module Documentation](roblox/README.md)** - Roblox integration and customization

### Environment Variables

| Variable | Location | Description |
|----------|----------|-------------|
| `BOT_SECRET` | Backend & Discord bot `.env` | Shared secret for bot-to-backend authentication |
| `SERVER_SECRET` | Backend `.env` | Secret for Roblox-to-backend authentication |
| `BACKEND_URL` | Discord bot `.env` | URL where the backend API is hosted |
| `PORT` | Backend `.env` | Port for the backend server (default: 3000) |
| `CLAIM_CHANNEL_ID` | Discord bot `.env` | (Optional) Channel ID for posting the generate button |
| `ERROR_LOG_CHANNEL_ID` | Discord bot `.env` | **Required** for error logging - Discord channel ID where all errors will be logged |
| `ERROR_REPORTER_NAME` | Discord bot `.env` | (Optional) Custom bot name in error messages (default: "EndzoneStrike Errors") |

### Error Logging

The bot includes a comprehensive error logging system that tracks all errors and bot downtime. See [ERROR_LOGGING_IMPLEMENTATION.md](ERROR_LOGGING_IMPLEMENTATION.md) for full details.

**Quick Setup:**
1. Create a dedicated channel in your Discord server (e.g., `#error-logs`)
2. Copy the channel ID and add it to `.env` as `ERROR_LOG_CHANNEL_ID`
3. All errors, exceptions, and bot lifecycle events will be logged to this channel

**What Gets Logged:**
- ✅ Bot startup and shutdown events
- ❌ All command execution errors with context
- ❌ Database connection issues
- ❌ Discord client errors and disconnections
- ❌ Unhandled exceptions and promise rejections
- ❌ External API errors (RSS monitoring, etc.)

### How It Works

1. **User requests code**: User runs `/generate-code` command or clicks the button in Discord
2. **Discord bot requests code**: Bot calls `POST /create-code` on the backend with the user's Discord ID
3. **Backend generates code**: Backend creates a unique 8-character alphanumeric code and stores it
4. **User receives code**: Bot DMs the code to the user (or sends ephemeral message if DMs are closed)
5. **User redeems in Roblox**: User enters the code in the Roblox game
6. **Roblox validates code**: Game calls `POST /redeem-code` on the backend
7. **Backend validates**: Backend checks if code exists and hasn't been used
8. **Rewards distributed**: Game gives rewards to the player based on the response

### Security Notes

- All API endpoints are authenticated with headers (`x-bot-key` and `x-api-key`)
- Codes are one-time use only
- DMs are used when possible to keep codes private
- Never expose `BOT_SECRET` or `SERVER_SECRET` in client-side code
- Use HTTPS in production

### Testing

See individual module READMEs for detailed testing instructions:
- [Backend Testing](backend/README.md#testing)
- [Discord Testing](discord/README.md#troubleshooting)
- [Roblox Testing](roblox/README.md#testing)

### Architecture

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Discord   │────────▶│   Backend   │◀────────│   Roblox    │
│     Bot     │  POST   │     API     │  POST   │    Game     │
│             │ /create │             │ /redeem │             │
└─────────────┘         └─────────────┘         └─────────────┘
       │                       │                       │
       │                       ▼                       │
       │                 ┌──────────┐                  │
       │                 │data.json │                  │
       │                 └──────────┘                  │
       │                                               │
       └──────────────── User Flow ───────────────────┘
```

### Contributing

When contributing to the code generation system:
1. Maintain backward compatibility
2. Update relevant documentation
3. Test all three components (Discord, Backend, Roblox)
4. Follow existing code style
5. Never commit secrets or API keys
