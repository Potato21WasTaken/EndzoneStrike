# Code Generator Setup Checklist

Use this checklist to track your progress while setting up the Discord-Roblox code generator.

> **📖 For detailed instructions, see [USAGE_GUIDE.md](USAGE_GUIDE.md)**

## ✅ Prerequisites

- [ ] Node.js 18+ installed
- [ ] Discord bot created with bot token
- [ ] Roblox game with HTTP requests enabled
- [ ] Basic knowledge of Discord bots and Roblox scripting

## 🔧 Backend Setup

- [ ] Navigate to `backend` folder
- [ ] Run `npm install`
- [ ] Create `backend/.env` file with:
  - [ ] `PORT=3000`
  - [ ] `BOT_SECRET=<your-random-string>`
  - [ ] `SERVER_SECRET=<your-random-string>`
- [ ] Start backend with `npm start`
- [ ] Verify backend is running (check console for "✅ Backend server running")

## 🤖 Discord Bot Setup

- [ ] Add to root `.env` file:
  - [ ] `BACKEND_URL=http://localhost:3000`
  - [ ] `BOT_SECRET=<same-as-backend>`
  - [ ] `CLAIM_CHANNEL_ID=<channel-id>` (optional)
- [ ] Edit `index.js`:
  - [ ] Add `require('./discord/generate-code')` at top
  - [ ] Add `registerGenerateHandlers(client)` in ready event
  - [ ] Add `sendGenerateMessage()` in ready event (optional)
- [ ] Edit `deploy-commands.js`:
  - [ ] Add `const { generateCommand } = require('./discord/generate-code');`
  - [ ] Add `commands.push(generateCommand.data.toJSON());`
- [ ] Run `node deploy-commands.js`
- [ ] Start Discord bot with `node index.js`

## 🎮 Discord Testing

- [ ] Type `/generate-code` in Discord
- [ ] Check DMs for code
- [ ] Verify code is 8 characters (like `ABC12XYZ`)

## 🎯 Roblox Setup

- [ ] Enable HTTP requests in Game Settings → Security
- [ ] Create `RedemptionService` ModuleScript in ServerScriptService
- [ ] Copy code from `roblox/RedemptionService.lua`
- [ ] Create server script with:
  - [ ] `RedemptionService.Initialize(BACKEND_URL, SERVER_SECRET)`
  - [ ] RemoteEvent creation
  - [ ] OnServerEvent handler
- [ ] Create GUI with:
  - [ ] TextBox for code input
  - [ ] TextButton for redeem button
  - [ ] TextLabel for status messages
- [ ] Create LocalScript for GUI logic

## 🌐 Roblox Testing Setup (ngrok)

- [ ] Install ngrok from [ngrok.com](https://ngrok.com/download)
- [ ] Run `ngrok http 3000` in new terminal
- [ ] Copy the `https://` URL from ngrok
- [ ] Update Roblox script with ngrok URL:
  - [ ] `local BACKEND_URL = "https://your-ngrok-url.ngrok-free.app"`
- [ ] Ensure `SERVER_SECRET` matches backend `.env`

## 🧪 Full System Testing

- [ ] Backend is running (`npm start`)
- [ ] ngrok is running (`ngrok http 3000`)
- [ ] Discord bot is running
- [ ] Generate code in Discord with `/generate-code`
- [ ] Copy the code
- [ ] Open Roblox Studio and click Play
- [ ] Enter code in GUI
- [ ] Click Redeem button
- [ ] Verify "Code redeemed!" message appears
- [ ] Check rewards were given to player

## 🎨 Customization (Optional)

- [ ] Customize reward amount in `backend/index.js`
- [ ] Customize reward distribution in `roblox/RedemptionService.lua`
- [ ] Customize Discord embed appearance in `discord/generate-code.js`
- [ ] Add custom items to rewards

## 🚀 Production Deployment (When Ready)

- [ ] Deploy backend to:
  - [ ] Render / Heroku / Railway (free options)
  - [ ] Or your own server
- [ ] Update Discord bot `.env` with production `BACKEND_URL`
- [ ] Update Roblox script with production `BACKEND_URL`
- [ ] Test full flow in production
- [ ] Set up monitoring and logging

## ❓ Troubleshooting

If you encounter issues, check:
- [ ] All secrets match between systems
- [ ] Backend is running and accessible
- [ ] HTTP requests enabled in Roblox
- [ ] Console logs for error messages
- [ ] [USAGE_GUIDE.md](USAGE_GUIDE.md) troubleshooting section

## 📚 Documentation References

- **Complete Guide:** [USAGE_GUIDE.md](USAGE_GUIDE.md)
- **Backend API:** [backend/README.md](backend/README.md)
- **Discord Module:** [discord/README.md](discord/README.md)
- **Roblox Module:** [roblox/README.md](roblox/README.md)

---

**Status:** ⬜ Not Started | 🟨 In Progress | ✅ Complete

**Last Updated:** [Your Date Here]
