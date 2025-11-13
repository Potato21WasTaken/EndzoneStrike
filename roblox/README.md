# Roblox Code Redemption Module

This module provides Roblox integration for redeeming Discord-generated codes in your Roblox game.

## Features

- **HTTP API Integration**: Communicates with the backend to validate and redeem codes
- **Promise-like Interface**: Easy-to-use async API
- **Error Handling**: Comprehensive error messages for debugging
- **Reward System**: Customizable reward distribution

## Installation

### 1. Enable HTTP Requests

In Roblox Studio, you must enable HTTP requests:

1. Go to **Home** → **Game Settings** → **Security**
2. Enable **Allow HTTP Requests**
3. Click **Save**

### 2. Add the Module to Your Game

1. Create a ModuleScript in **ServerScriptService** or **ServerStorage**
2. Name it `RedemptionService`
3. Copy the contents of `RedemptionService.lua` into the module

### 3. Configure the Backend

In a server script (e.g., in ServerScriptService):

```lua
local RedemptionService = require(game.ServerScriptService.RedemptionService)

-- Initialize with your backend URL and API key
local BACKEND_URL = "https://your-backend.com"  -- Your backend URL
local SERVER_SECRET = "your-server-secret-here"  -- From backend .env

RedemptionService.Initialize(BACKEND_URL, SERVER_SECRET)
```

**Important:** 
- Replace `BACKEND_URL` with your actual backend URL
- Replace `SERVER_SECRET` with the same `SERVER_SECRET` from your backend `.env` file
- Never expose your SERVER_SECRET to clients!

## Usage

### Basic Code Redemption

```lua
local RedemptionService = require(game.ServerScriptService.RedemptionService)

-- When a player enters a code
local function onCodeEntered(player, code)
	RedemptionService.RedeemCode(player, code)
		:andThen(function(reward)
			-- Code redeemed successfully!
			print("Reward:", reward)
			
			-- Give rewards to the player
			RedemptionService.GiveRewards(player, reward)
			
			-- Send success message to player
			-- (implement your own notification system)
			print("Code redeemed successfully!")
		end)
		:catch(function(errorMessage)
			-- Code redemption failed
			warn("Redemption error:", errorMessage)
			
			-- Send error message to player
			-- (implement your own notification system)
			if errorMessage == "This code has already been redeemed" then
				print("This code has already been used!")
			elseif errorMessage == "Invalid code" then
				print("Invalid code. Please check and try again.")
			else
				print("Failed to redeem code. Please try again later.")
			end
		end)
end
```

### With GUI Integration

```lua
local RedemptionService = require(game.ServerScriptService.RedemptionService)
local Players = game:GetService("Players")

-- Remote event for client-server communication
local RedeemCodeEvent = Instance.new("RemoteEvent")
RedeemCodeEvent.Name = "RedeemCode"
RedeemCodeEvent.Parent = game.ReplicatedStorage

-- Server-side handler
RedeemCodeEvent.OnServerEvent:Connect(function(player, code)
	-- Validate input
	if type(code) ~= "string" or code == "" then
		RedeemCodeEvent:FireClient(player, {
			success = false,
			message = "Invalid code format"
		})
		return
	end
	
	-- Redeem the code
	RedemptionService.RedeemCode(player, code)
		:andThen(function(reward)
			-- Give rewards
			RedemptionService.GiveRewards(player, reward)
			
			-- Notify client of success
			RedeemCodeEvent:FireClient(player, {
				success = true,
				message = "Code redeemed successfully!",
				reward = reward
			})
		end)
		:catch(function(errorMessage)
			-- Notify client of failure
			RedeemCodeEvent:FireClient(player, {
				success = false,
				message = errorMessage
			})
		end)
end)
```

### Client-Side GUI (LocalScript)

```lua
-- In a LocalScript inside your GUI
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RedeemCodeEvent = ReplicatedStorage:WaitForChild("RedeemCode")

local codeTextBox = script.Parent.CodeTextBox
local redeemButton = script.Parent.RedeemButton
local messageLabel = script.Parent.MessageLabel

-- When player clicks redeem button
redeemButton.MouseButton1Click:Connect(function()
	local code = codeTextBox.Text
	
	if code == "" then
		messageLabel.Text = "Please enter a code"
		return
	end
	
	-- Disable button while processing
	redeemButton.Enabled = false
	messageLabel.Text = "Redeeming..."
	
	-- Send to server
	RedeemCodeEvent:FireServer(code)
end)

-- Handle response from server
RedeemCodeEvent.OnClientEvent:Connect(function(response)
	redeemButton.Enabled = true
	
	if response.success then
		messageLabel.Text = response.message
		messageLabel.TextColor3 = Color3.fromRGB(0, 255, 0)
		
		-- Clear the text box
		codeTextBox.Text = ""
		
		-- Show reward notification
		if response.reward then
			print("You received:", response.reward.coins, "coins!")
		end
	else
		messageLabel.Text = response.message
		messageLabel.TextColor3 = Color3.fromRGB(255, 0, 0)
	end
	
	-- Clear message after 5 seconds
	wait(5)
	messageLabel.Text = ""
end)
```

## API Reference

### `RedemptionService.Initialize(backendUrl, apiKey)`

Initialize the redemption service with your backend configuration.

**Parameters:**
- `backendUrl` (string) - The URL of your backend API
- `apiKey` (string) - Your SERVER_SECRET from the backend

**Example:**
```lua
RedemptionService.Initialize("https://api.example.com", "my-secret-key")
```

### `RedemptionService.RedeemCode(player, code)`

Redeem a code for a player.

**Parameters:**
- `player` (Player) - The player redeeming the code
- `code` (string) - The code to redeem

**Returns:** Promise-like object with `andThen` and `catch` methods

**Example:**
```lua
RedemptionService.RedeemCode(player, "ABC12XYZ")
	:andThen(function(reward)
		print("Success!", reward)
	end)
	:catch(function(error)
		warn("Error:", error)
	end)
```

### `RedemptionService.GiveRewards(player, reward)`

Give rewards to a player based on the reward data from the backend.

**Parameters:**
- `player` (Player) - The player to give rewards to
- `reward` (table) - The reward data from the backend

**Example:**
```lua
RedemptionService.GiveRewards(player, {
	coins = 1000,
	items = {"Sword", "Shield"},
	discordId = "123456789"
})
```

**Note:** This is a sample implementation. You should customize it for your game's reward system.

### `RedemptionService.CheckCodeStatus(code)`

Check the status of a code (for debugging).

**Parameters:**
- `code` (string) - The code to check

**Returns:** `(table|nil, string|nil)` - Status data or nil, error message or nil

**Example:**
```lua
local status, err = RedemptionService.CheckCodeStatus("ABC12XYZ")
if status then
	print("Code status:", status.redeemed)
else
	warn("Error:", err)
end
```

## Reward Structure

The reward object returned from the backend has the following structure:

```lua
{
	discordId = "123456789012345678",  -- Discord user ID
	robloxUserId = "987654321",        -- Roblox user ID
	code = "ABC12XYZ",                 -- The redeemed code
	redeemedAt = "2024-01-15T10:30:00.000Z",  -- Timestamp
	coins = 1000,                      -- Coins to give (customize in backend)
	items = {}                         -- Items to give (customize in backend)
}
```

## Customizing Rewards

Edit the `GiveRewards` function in `RedemptionService.lua` to match your game's systems:

```lua
function RedemptionService.GiveRewards(player, reward)
	-- Example: Give coins using your economy system
	if reward.coins then
		YourEconomyModule.AddCoins(player, reward.coins)
	end
	
	-- Example: Give items using your inventory system
	if reward.items then
		for _, itemName in ipairs(reward.items) do
			YourInventoryModule.GiveItem(player, itemName)
		end
	end
	
	-- Example: Save Discord ID for future features
	if reward.discordId then
		YourDataModule.SaveDiscordId(player, reward.discordId)
	end
end
```

You can also customize the reward values in the backend (`backend/index.js`):

```javascript
// In the /redeem-code endpoint
reward: {
	discordId: codeData.discordId,
	robloxUserId,
	code,
	redeemedAt: codeData.redeemedAt,
	coins: 5000,  // Customize this
	items: ["Epic Sword", "Legendary Shield"]  // Customize this
}
```

## Error Handling

The module handles several error cases:

| Error | Description |
|-------|-------------|
| `"Code cannot be empty"` | The code string is empty |
| `"Invalid code"` | Code doesn't exist in the database |
| `"This code has already been redeemed"` | Code was already used |
| `"Server authentication failed"` | API key is invalid |
| `"Failed to connect to redemption server"` | Network error or backend is down |

## Security Best Practices

1. **Never expose SERVER_SECRET to clients**
   - Keep all redemption logic on the server
   - Use RemoteEvents for client-server communication

2. **Validate user input**
   - Check that codes are reasonable length
   - Sanitize input before sending to backend

3. **Rate limiting**
   - Consider adding cooldowns to prevent spam
   - Track failed attempts per player

4. **Use HTTPS**
   - Always use HTTPS URLs in production
   - Never use HTTP for sensitive data

## Troubleshooting

### "Service not initialized"
Call `RedemptionService.Initialize()` before using any other functions.

### "HttpService is not allowed to access ROBLOX resources"
Make sure you're using an external URL, not a ROBLOX URL.

### "HTTP requests are not enabled"
Enable HTTP requests in Game Settings → Security → Allow HTTP Requests.

### "Failed to connect to redemption server"
- Check that your backend is running and accessible
- Verify the BACKEND_URL is correct
- Ensure your backend supports CORS if needed
- Check Roblox's network status

### "Server authentication failed"
- Verify SERVER_SECRET matches the backend configuration
- Check for typos or extra spaces in the API key

## Testing

### Local Testing

1. Run the backend locally:
   ```bash
   cd backend
   npm start
   ```

2. Use the backend URL `http://localhost:3000` for testing:
   ```lua
   RedemptionService.Initialize("http://localhost:3000", "your-secret")
   ```

3. Test code redemption in Roblox Studio

**Note:** Roblox Studio may not be able to connect to `localhost`. You may need to use a tool like ngrok to expose your local backend to the internet.

### Using ngrok

```bash
# Install ngrok: https://ngrok.com/
ngrok http 3000
```

Then use the ngrok URL in Roblox:
```lua
RedemptionService.Initialize("https://abc123.ngrok.io", "your-secret")
```

## Example Complete Implementation

See the `examples/` directory for a complete implementation including:
- Server script with initialization
- RemoteEvent setup
- GUI with code input
- Reward distribution system

## Support

For issues or questions:
1. Check the backend logs for error messages
2. Use `CheckCodeStatus()` to debug code issues
3. Verify all configuration values are correct
4. Check that HTTP requests are enabled in Roblox
