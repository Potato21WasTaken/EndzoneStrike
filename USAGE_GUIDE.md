# How to Use the Discord-Roblox Code Generator

This guide will walk you through setting up and using the Discord-Roblox code generation system from start to finish.

## 🎯 What Does This System Do?

The code generator allows Discord users to generate unique codes that can be redeemed in your Roblox game for rewards (coins, items, etc.). Here's the flow:

1. User types `/generate-code` in Discord or clicks a button
2. Bot sends them a unique code via DM
3. User enters the code in your Roblox game
4. Game validates the code and gives rewards

## 📋 Prerequisites

Before you start, make sure you have:

- [ ] A Discord bot (with bot token)
- [ ] A Roblox game with HTTP requests enabled
- [ ] Node.js 18+ installed on your computer
- [ ] Basic knowledge of Discord bots and Roblox scripting

## 🚀 Quick Start Guide

### Part 1: Backend Setup (5 minutes)

The backend is the server that stores and validates codes.

1. **Navigate to the backend folder:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create a `.env` file in the `backend` folder:**
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
   ```javascript
   const { generateCommand } = require('./discord/generate-code');
   
   const commands = [
     // ... your existing commands ...
     generateCommand.data.toJSON(),
   ];
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
   local BACKEND_URL = "http://localhost:3000"  -- For testing
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

### Backend Issues

**Problem:** Backend won't start
- **Solution:** Make sure you ran `npm install` and have a `.env` file

**Problem:** Codes not saving
- **Solution:** Check that the backend has write permissions for `data.json`

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
