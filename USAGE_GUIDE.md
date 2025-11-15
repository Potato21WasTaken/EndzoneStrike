# How to Use the Discord-Roblox Code Generator

This guide will walk you through setting up and using the Discord-Roblox code generation system from start to finish.

## 🎯 What Does This System Do?

The code generator allows Discord users to generate unique codes that can be redeemed in your Roblox game for rewards (coins, items, etc.). Here's the flow:

1. User types `/generate-code` in Discord or clicks a button
2. Bot sends them a unique code via DM
3. User enters the code in your Roblox game
4. Game validates the code and gives rewards

## 🏗️ Understanding the Architecture

**Important:** This system has **3 separate parts** that work together:

1. **Discord Bot** (`index.js` in the root folder)
   - Your main Discord bot
   - Handles Discord commands and user interactions

2. **Backend API Server** (`backend/index.js` - a separate server!)
   - A REST API server that stores and validates codes
   - Runs separately from your Discord bot
   - Both Discord bot and Roblox connect to this

3. **Roblox Game** (your Roblox game files)
   - Connects to the backend to redeem codes

**Why separate servers?** The Discord bot and backend API are two different Node.js applications that run at the same time:
- The Discord bot talks to Discord's servers
- The backend API stores codes and validates them
- Both your Discord bot AND your Roblox game need to connect to the backend API
- This separation keeps your code organized and secure

## 📋 Prerequisites

Before you start, make sure you have:

- [ ] A Discord bot (with bot token)
- [ ] A Roblox game with HTTP requests enabled
- [ ] Node.js 18+ installed on your computer
- [ ] Basic knowledge of Discord bots and Roblox scripting

## 💻 Where to Run Commands

**All bash/terminal commands in this guide should be run on your computer**, not in Roblox or Discord:

### Using Visual Studio Code (Recommended! ⭐)
- **If you're already using VS Code:** Just open the integrated terminal (View → Terminal or `` Ctrl+` ``)
- VS Code will automatically open the terminal in your project folder
- This is the easiest option if you're editing code in VS Code!

### Windows Users
- Open **Command Prompt** (search for "cmd" in Start menu) or **PowerShell**
- Or use **Windows Terminal** if you have it installed
- Navigate to where you downloaded/cloned this repository

### Mac Users
- Open **Terminal** (found in Applications → Utilities)
- Navigate to where you downloaded/cloned this repository

### Linux Users
- Open your terminal application
- Navigate to where you downloaded/cloned this repository

### ⚠️ Common Issue: Make sure you're in the RIGHT folder!

If you see an error like "No such file or directory" when running `cd backend`, you're probably in the wrong folder.

**Check where you are:**
```bash
pwd                    # Shows your current folder
ls                     # Lists files in current folder
```

**You should see:** `backend`, `commands`, `discord`, `roblox`, `index.js`, `package.json`

**If you're in a subfolder** (like `EndzoneStrikeBot`), go UP one level:
```bash
cd ..                  # Go up one folder
```

**Example:** If you downloaded the repository to your Desktop, you would:
```bash
# Windows
cd C:\Users\YourName\Desktop\EndzoneStrike

# Mac/Linux
cd ~/Desktop/EndzoneStrike
```

**Note:** Commands that start with `cd`, `npm`, `node`, `curl`, or `ngrok` are run in your computer's terminal/command prompt, NOT in Discord or Roblox.

## 🚀 Quick Start Guide

### Part 1: Backend Setup (5 minutes)

The backend is a **separate API server** that stores and validates codes.

> **💡 Reminder:** Run these commands in your **computer's terminal/command prompt**, from the root folder of this repository.

> **❓ Why does backend need its own files?** The backend is a completely separate Node.js server from your Discord bot. It runs independently and has its own dependencies, configuration, and purpose. Think of it like having two separate apps that talk to each other.

1. **Navigate to the backend folder:**
   ```bash
   cd backend
   ```
   
   **If you get an error:** Make sure you're in the root folder of the repository (run `pwd` to check). You should see folders like `backend`, `commands`, `discord`, etc.

2. **Install dependencies:**
   ```bash
   npm install
   ```
   
   This installs packages the backend needs (Express, etc.) - separate from your Discord bot's packages.

3. **Create a `.env` file in the `backend` folder:**
   
   You can create this file using any text editor (Notepad, VS Code, etc.). Save it as `.env` inside the `backend` folder.
   
   > **❓ Why a separate .env file?** The backend has different configuration needs than your Discord bot. The backend needs PORT and SERVER_SECRET (for Roblox authentication), while your Discord bot needs BOT_TOKEN and MONGO_URI. Keeping them separate makes it clearer what each server needs.
   
   ```env
   PORT=3000
   BOT_SECRET=your-random-bot-secret-123
   SERVER_SECRET=your-random-server-secret-456
   ```
   
   > **Important:** Replace the secrets with your own random strings. You can generate them using online tools or just type random characters.

4. **Start the backend:**
   ```bash
   npm start
   ```
   
   You should see: `✅ Backend server running on port 3000`

5. **Test it (optional):**
   ```bash
   curl http://localhost:3000/health
   ```
   
   Should return: `{"status":"healthy"}`

### Part 2: Discord Bot Integration (10 minutes)

Now let's connect the Discord bot to the backend.

1. **Add to your main `.env` file (in the root folder):**
   ```env
   BACKEND_URL=http://localhost:3000
   BOT_SECRET=your-random-bot-secret-123
   CLAIM_CHANNEL_ID=123456789012345678
   ```
   
   > **Note:** 
   > - `BOT_SECRET` must match the one in `backend/.env`
   > - `CLAIM_CHANNEL_ID` is optional - it's where the button message appears

2. **Edit `index.js`** - Add this near the top with other requires:
   ```javascript
   const { registerGenerateHandlers, sendGenerateMessage } = require('./discord/generate-code');
   ```

3. **Edit `index.js`** - Add this inside your `client.once('ready', ...)` block:
   ```javascript
   client.once('ready', () => {
     console.log(`✅ Logged in as ${client.user.tag}`);
     
     // ... your existing code ...
     
     // Register code generation handlers
     registerGenerateHandlers(client);
     
     // Optional: Send the generate button message
     const claimChannelId = process.env.CLAIM_CHANNEL_ID;
     if (claimChannelId) {
       sendGenerateMessage(client, claimChannelId)
         .then(() => console.log('✅ Generate code message sent'))
         .catch(err => console.error('❌ Failed to send generate message:', err));
     }
   });
   ```

4. **Deploy the slash command** - Edit `deploy-commands.js`:
   
   Add this at the top with other requires:
   ```javascript
   const { generateCommand } = require('./discord/generate-code');
   ```
   
   Then add the command to the array (before the `rest.put` call):
   ```javascript
   // Add this line after the for loop
   commands.push(generateCommand.data.toJSON());
   ```
   
   Your deploy-commands.js should look like this:
   ```javascript
   const { REST } = require('@discordjs/rest');
   const { Routes } = require('discord-api-types/v10');
   const fs = require('fs');
   const path = require('path');
   const { generateCommand } = require('./discord/generate-code'); // ADD THIS
   require('dotenv').config();
   
   const commands = [];
   const commandsPath = path.join(__dirname, 'commands');
   
   for (const file of fs.readdirSync(commandsPath)) {
     if (file.endsWith('.js')) {
       const command = require(`./commands/${file}`);
       commands.push(command.data.toJSON());
     }
   }
   
   // ADD THIS LINE
   commands.push(generateCommand.data.toJSON());
   
   const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
   
   (async () => {
     try {
       console.log(`Registering ${commands.length} slash commands...`);
       await rest.put(
         Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
         { body: commands }
       );
       console.log('✅ Commands registered.');
     } catch (err) {
       console.error(err);
     }
   })();
   ```

5. **Run the deployment:**
   ```bash
   node deploy-commands.js
   ```

6. **Restart your Discord bot:**
   ```bash
   node index.js
   ```

### Part 3: Testing Discord Integration (2 minutes)

1. **In any Discord channel, type:** `/generate-code`
2. **Check your DMs** - You should receive a code like `ABC12XYZ`
3. **Success!** ✅ If you got a code, the Discord part is working!

### Part 4: Roblox Game Integration (15 minutes)

Now let's set up the Roblox side.

1. **Enable HTTP Requests in your game:**
   - Open your game in Roblox Studio
   - Go to **Home** → **Game Settings** → **Security**
   - Enable **"Allow HTTP Requests"**
   - Click **Save**

2. **Add the RedemptionService module:**
   - In **ServerScriptService**, create a new **ModuleScript**
   - Name it `RedemptionService`
   - Copy the code from `roblox/RedemptionService.lua` into it

3. **Create a server script** (in ServerScriptService):
   ```lua
   local RedemptionService = require(game.ServerScriptService.RedemptionService)
   
   -- Initialize with your backend URL
   -- NOTE: Roblox Studio cannot connect to localhost!
   -- For testing, use ngrok or deploy to a free host (see troubleshooting below)
   local BACKEND_URL = "https://your-ngrok-url.ngrok-free.app"  -- Replace with your URL
   local SERVER_SECRET = "your-random-server-secret-456"  -- From backend/.env
   
   RedemptionService.Initialize(BACKEND_URL, SERVER_SECRET)
   
   -- Create RemoteEvent for GUI communication
   local RedeemCodeEvent = Instance.new("RemoteEvent")
   RedeemCodeEvent.Name = "RedeemCode"
   RedeemCodeEvent.Parent = game.ReplicatedStorage
   
   -- Handle redemption requests from clients
   RedeemCodeEvent.OnServerEvent:Connect(function(player, code)
       RedemptionService.RedeemCode(player, code)
           :andThen(function(reward)
               RedemptionService.GiveRewards(player, reward)
               RedeemCodeEvent:FireClient(player, {
                   success = true,
                   message = "Code redeemed!"
               })
           end)
           :catch(function(error)
               RedeemCodeEvent:FireClient(player, {
                   success = false,
                   message = error
               })
           end)
   end)
   ```

4. **Create a simple GUI for code input:**
   - In **StarterGui**, create a **ScreenGui**
   - Add a **Frame** (name it "CodeFrame")
   - Inside the Frame, add:
     - **TextBox** (name it "CodeInput")
     - **TextButton** (name it "RedeemButton", text: "Redeem")
     - **TextLabel** (name it "StatusLabel", text: "")

5. **Create a LocalScript in the Frame:**
   ```lua
   local ReplicatedStorage = game:GetService("ReplicatedStorage")
   local RedeemCodeEvent = ReplicatedStorage:WaitForChild("RedeemCode")
   
   local codeInput = script.Parent.CodeInput
   local redeemButton = script.Parent.RedeemButton
   local statusLabel = script.Parent.StatusLabel
   
   redeemButton.MouseButton1Click:Connect(function()
       local code = codeInput.Text
       if code ~= "" then
           statusLabel.Text = "Redeeming..."
           RedeemCodeEvent:FireServer(code)
       end
   end)
   
   RedeemCodeEvent.OnClientEvent:Connect(function(response)
       statusLabel.Text = response.message
       if response.success then
           statusLabel.TextColor3 = Color3.fromRGB(0, 255, 0)
           codeInput.Text = ""
       else
           statusLabel.TextColor3 = Color3.fromRGB(255, 0, 0)
       end
   end)
   ```

### Part 5: Testing the Full System (5 minutes)

**Important:** Roblox Studio cannot connect to `localhost`! You need to expose your backend to the internet for testing. 

**Quick Option: Use ngrok (Free)**

1. **Install ngrok:**
   - Download from [ngrok.com](https://ngrok.com/download)
   - Extract and add to your PATH

2. **Start ngrok in a new terminal:**
   ```bash
   ngrok http 3000
   ```
   
   You'll see output like:
   ```
   Forwarding  https://abc123.ngrok-free.app -> http://localhost:3000
   ```

3. **Update your Roblox script** with the ngrok URL:
   ```lua
   local BACKEND_URL = "https://abc123.ngrok-free.app"
   ```

**Now test the system:**

1. **Make sure the backend is running:**
   ```bash
   cd backend
   npm start
   ```

2. **Generate a code in Discord:**
   - Type `/generate-code`
   - Copy the code from your DMs

3. **Test in Roblox Studio:**
   - Click the **Play** button
   - Enter the code in your GUI
   - Click **Redeem**
   - You should see "Code redeemed!" ✅

4. **Check the rewards:**
   - By default, the code gives 1000 coins
   - Customize this in `backend/index.js` or `roblox/RedemptionService.lua`

## 🎮 How Users Will Use It

Once everything is set up:

### Discord Side
1. User types `/generate-code` or clicks the "Generate Code" button
2. Bot sends a unique code via DM (like `ABC12XYZ`)
3. User copies the code

### Roblox Side
1. User opens your Roblox game
2. User enters the code in the redemption GUI
3. User clicks "Redeem"
4. User receives rewards instantly!

## 🔧 Customizing Rewards

### Change Reward Amount in Backend

Edit `backend/index.js`, find the `/redeem-code` endpoint:

```javascript
reward: {
  discordId: codeData.discordId,
  robloxUserId,
  code,
  redeemedAt: codeData.redeemedAt,
  coins: 5000,  // Change this!
  items: ["Sword", "Shield"]  // Add items here!
}
```

### Change How Rewards are Given in Roblox

Edit `roblox/RedemptionService.lua`, find the `GiveRewards` function:

```lua
function RedemptionService.GiveRewards(player, reward)
    -- Give coins
    if reward.coins then
        local leaderstats = player:FindFirstChild("leaderstats")
        if leaderstats then
            local coins = leaderstats:FindFirstChild("Coins")
            if coins then
                coins.Value = coins.Value + reward.coins
            end
        end
    end
    
    -- Give items
    if reward.items then
        for _, itemName in ipairs(reward.items) do
            -- Your custom item-giving logic here
            print("Giving " .. itemName .. " to " .. player.Name)
        end
    end
end
```

## 🌐 Deploying to Production

When you're ready to go live:

### Deploy the Backend

You can deploy the backend to:
- **Heroku** (free tier available)
- **Render** (free tier available)
- **Railway** (free tier available)
- **DigitalOcean** ($5/month)

**Steps (using Render as example):**
1. Create a free account on [render.com](https://render.com)
2. Create a new "Web Service"
3. Connect your GitHub repository
4. Set the following:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Add environment variables:
   - `BOT_SECRET`: (your secret)
   - `SERVER_SECRET`: (your secret)
   - `PORT`: 3000
6. Deploy!

### Update Your Configuration

Once deployed, update your environment variables:

**Discord bot `.env`:**
```env
BACKEND_URL=https://your-app.onrender.com
```

**Roblox server script:**
```lua
local BACKEND_URL = "https://your-app.onrender.com"
```

## 🐛 Troubleshooting

### Discord Issues

**Problem:** `/generate-code` command doesn't appear
- **Solution:** Run `node deploy-commands.js` and wait 5 minutes

**Problem:** "Bot is not configured properly"
- **Solution:** Check that `BOT_SECRET` is set in your `.env` file

**Problem:** "Failed to generate code"
- **Solution:** Make sure the backend is running and `BACKEND_URL` is correct

### Roblox Issues

**Problem:** "HTTP requests are not enabled"
- **Solution:** Enable in Game Settings → Security → Allow HTTP Requests

**Problem:** "Failed to connect to redemption server"
- **Solution:** Check that backend is running and URL is correct

**Problem:** "Server authentication failed"
- **Solution:** Make sure `SERVER_SECRET` matches between Roblox and backend

**Problem:** "Invalid code"
- **Solution:** Code might be typo'd or already used (codes are one-time use)

**Problem:** "No such file or directory" when running `cd backend`
- **Solution:** You're in the wrong folder! Run `pwd` to see where you are. You should be in the root EndzoneStrike folder, not in a subfolder like `EndzoneStrikeBot`. Use `cd ..` to go up one level if needed.

### Backend Issues

**Problem:** Backend won't start
- **Solution:** Make sure you ran `npm install` and have a `.env` file

**Problem:** Codes not saving
- **Solution:** Check that the backend has write permissions for `data.json`

## ❓ Frequently Asked Questions

### Q: Why do I need a separate backend folder with its own index.js?

**A:** The backend is a **completely separate server** from your Discord bot:
- **Discord Bot** (`index.js` in root) - Handles Discord commands and users
- **Backend API** (`backend/index.js`) - Stores and validates codes

They're two different Node.js applications that run at the same time. The backend is an API that both your Discord bot AND your Roblox game connect to. This keeps your code organized and secure.

### Q: Can't I just use my existing .env file?

**A:** No, because they're separate applications with different needs:
- **Root .env** - Discord bot needs: `BOT_TOKEN`, `MONGO_URI`, `CLIENT_ID`, etc.
- **Backend .env** - API server needs: `PORT`, `BOT_SECRET`, `SERVER_SECRET`

The backend doesn't need your Discord bot token, and your bot doesn't need the backend's port configuration. Keeping them separate makes configuration clearer.

### Q: Do I run both servers at the same time?

**A:** Yes! You need to run:
1. The backend API server (in one terminal: `cd backend && npm start`)
2. Your Discord bot (in another terminal: `node index.js`)

Both need to be running for the code generator to work.

## 📚 More Information

For more detailed documentation:
- **Backend API:** See [backend/README.md](backend/README.md)
- **Discord Integration:** See [discord/README.md](discord/README.md)
- **Roblox Integration:** See [roblox/README.md](roblox/README.md)
- **Full Examples:** See [discord/INTEGRATION_EXAMPLE.js](discord/INTEGRATION_EXAMPLE.js) and [roblox/INTEGRATION_EXAMPLE.lua](roblox/INTEGRATION_EXAMPLE.lua)

## ❓ Still Need Help?

If you're still stuck:
1. Check the backend logs for errors
2. Check the Discord bot console for errors
3. Check the Roblox output window for errors
4. Make sure all secrets match between systems
5. Verify HTTP requests are enabled in Roblox

## 🎉 That's It!

You now have a fully functional Discord-to-Roblox code generation system! Users can generate codes in Discord and redeem them in your Roblox game for rewards.

Happy coding! 🚀
