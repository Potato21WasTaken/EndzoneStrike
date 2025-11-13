--[[
	EXAMPLE: Complete Roblox Implementation
	
	This example shows a complete implementation of the code redemption system
	including server initialization, RemoteEvent setup, and a basic GUI.
]]

-- =====================================================
-- SERVER SCRIPT (ServerScriptService)
-- =====================================================

local RedemptionService = require(game.ServerScriptService.RedemptionService)
local Players = game:GetService("Players")

-- Initialize the service with your backend URL and API key
local BACKEND_URL = "https://your-backend.com"  -- Replace with your backend URL
local SERVER_SECRET = "your-server-secret"      -- Replace with your SERVER_SECRET from backend .env

RedemptionService.Initialize(BACKEND_URL, SERVER_SECRET)

-- Create RemoteEvent for client-server communication
local RedeemCodeEvent = Instance.new("RemoteEvent")
RedeemCodeEvent.Name = "RedeemCode"
RedeemCodeEvent.Parent = game.ReplicatedStorage

-- Server-side handler for code redemption
RedeemCodeEvent.OnServerEvent:Connect(function(player, code)
	-- Validate input
	if type(code) ~= "string" or code == "" then
		RedeemCodeEvent:FireClient(player, {
			success = false,
			message = "Please enter a valid code"
		})
		return
	end
	
	-- Rate limiting (optional but recommended)
	local lastAttempt = player:GetAttribute("LastRedemptionAttempt") or 0
	local now = os.time()
	
	if now - lastAttempt < 3 then
		RedeemCodeEvent:FireClient(player, {
			success = false,
			message = "Please wait before trying again"
		})
		return
	end
	
	player:SetAttribute("LastRedemptionAttempt", now)
	
	-- Redeem the code
	print(string.format("[Redemption] %s attempting to redeem: %s", player.Name, code))
	
	RedemptionService.RedeemCode(player, code)
		:andThen(function(reward)
			print(string.format("[Redemption] Success! %s redeemed code %s", player.Name, code))
			
			-- Give rewards to the player
			RedemptionService.GiveRewards(player, reward)
			
			-- Notify client of success
			RedeemCodeEvent:FireClient(player, {
				success = true,
				message = "Code redeemed successfully!",
				reward = {
					coins = reward.coins,
					items = reward.items
				}
			})
		end)
		:catch(function(errorMessage)
			warn(string.format("[Redemption] Failed for %s: %s", player.Name, errorMessage))
			
			-- Determine user-friendly error message
			local userMessage = errorMessage
			if errorMessage == "This code has already been redeemed" then
				userMessage = "This code has already been used"
			elseif errorMessage == "Invalid code" then
				userMessage = "Invalid code. Please check and try again."
			elseif errorMessage == "Failed to connect to redemption server" then
				userMessage = "Server is temporarily unavailable. Please try again later."
			end
			
			-- Notify client of failure
			RedeemCodeEvent:FireClient(player, {
				success = false,
				message = userMessage
			})
		end)
end)

-- =====================================================
-- CUSTOM REWARD IMPLEMENTATION
-- =====================================================

-- Override the GiveRewards function to match your game's systems
-- Edit RedemptionService.lua or create a wrapper function:

function CustomGiveRewards(player, reward)
	-- Example: Give coins
	if reward.coins and reward.coins > 0 then
		local leaderstats = player:FindFirstChild("leaderstats")
		if leaderstats then
			local coins = leaderstats:FindFirstChild("Coins")
			if coins then
				coins.Value = coins.Value + reward.coins
				print(string.format("Gave %d coins to %s", reward.coins, player.Name))
			end
		end
	end
	
	-- Example: Give items to player's inventory
	if reward.items and #reward.items > 0 then
		local inventory = player:FindFirstChild("Inventory")
		if inventory then
			for _, itemName in ipairs(reward.items) do
				-- Your item-giving logic here
				local item = game.ServerStorage.Items:FindFirstChild(itemName)
				if item then
					local clone = item:Clone()
					clone.Parent = inventory
					print(string.format("Gave %s to %s", itemName, player.Name))
				end
			end
		end
	end
	
	-- Save Discord ID for cross-platform features
	if reward.discordId then
		player:SetAttribute("DiscordID", reward.discordId)
		print(string.format("Linked Discord ID %s to %s", reward.discordId, player.Name))
	end
end

-- =====================================================
-- CLIENT SCRIPT (LocalScript in ScreenGui)
-- =====================================================

--[[
GUI Structure:
ScreenGui
├── Frame (RedemptionFrame)
│   ├── TextLabel (Title: "Redeem Code")
│   ├── TextBox (CodeInput)
│   ├── TextButton (RedeemButton)
│   └── TextLabel (StatusMessage)
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local player = Players.LocalPlayer
local RedeemCodeEvent = ReplicatedStorage:WaitForChild("RedeemCode")

-- GUI References
local gui = script.Parent
local codeInput = gui.CodeInput
local redeemButton = gui.RedeemButton
local statusMessage = gui.StatusMessage

-- Button click handler
redeemButton.MouseButton1Click:Connect(function()
	local code = codeInput.Text
	
	-- Validate input
	if code == "" or code:match("^%s*$") then
		statusMessage.Text = "Please enter a code"
		statusMessage.TextColor3 = Color3.fromRGB(255, 100, 100)
		return
	end
	
	-- Disable button while processing
	redeemButton.Enabled = false
	redeemButton.BackgroundColor3 = Color3.fromRGB(100, 100, 100)
	statusMessage.Text = "Redeeming code..."
	statusMessage.TextColor3 = Color3.fromRGB(255, 255, 255)
	
	-- Send to server
	RedeemCodeEvent:FireServer(code)
end)

-- Handle server response
RedeemCodeEvent.OnClientEvent:Connect(function(response)
	-- Re-enable button
	redeemButton.Enabled = true
	redeemButton.BackgroundColor3 = Color3.fromRGB(0, 170, 255)
	
	if response.success then
		-- Success!
		statusMessage.Text = response.message
		statusMessage.TextColor3 = Color3.fromRGB(100, 255, 100)
		
		-- Clear input
		codeInput.Text = ""
		
		-- Show reward notification (optional)
		if response.reward and response.reward.coins then
			local notification = string.format("You received %d coins!", response.reward.coins)
			-- Show this in your notification system
			print(notification)
		end
		
		-- Clear message after 5 seconds
		task.wait(5)
		statusMessage.Text = ""
	else
		-- Error
		statusMessage.Text = response.message
		statusMessage.TextColor3 = Color3.fromRGB(255, 100, 100)
		
		-- Clear message after 5 seconds
		task.wait(5)
		statusMessage.Text = ""
	end
end)

-- Optional: Clear status on text change
codeInput:GetPropertyChangedSignal("Text"):Connect(function()
	if statusMessage.Text ~= "Redeeming code..." then
		statusMessage.Text = ""
	end
end)

-- =====================================================
-- TESTING
-- =====================================================

--[[
To test this implementation:

1. Make sure HTTP requests are enabled:
   Game Settings → Security → Allow HTTP Requests

2. Start your backend server locally or deploy it

3. Update BACKEND_URL and SERVER_SECRET in the server script

4. In Discord, use /generate-code to get a test code

5. In Roblox Studio, run the game and enter the code

6. Check the output for success/error messages

7. Verify the player received rewards

Common issues:
- "HTTP requests are not enabled" → Enable in Game Settings
- "Failed to connect" → Check backend URL and ensure it's running
- "Server authentication failed" → Verify SERVER_SECRET matches backend
- "Invalid code" → Make sure the code was generated and not yet redeemed
]]
