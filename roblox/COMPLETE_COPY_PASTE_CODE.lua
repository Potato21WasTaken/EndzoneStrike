--[[
	==============================================
	COMPLETE ROBLOX CODE REDEMPTION SYSTEM
	Copy this entire file and use as needed
	==============================================
]]

-- =====================================================
-- PART 1: RedemptionService ModuleScript
-- Location: ServerScriptService.RedemptionService
-- =====================================================

local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")

local RedemptionService = {}
RedemptionService.__index = RedemptionService

-- Configuration
local BACKEND_URL = nil
local API_KEY = nil
local INITIALIZED = false

--[[
	Initialize the redemption service
	@param backendUrl (string) - The URL of your backend API
	@param apiKey (string) - Your SERVER_SECRET from the backend
]]
function RedemptionService.Initialize(backendUrl, apiKey)
	assert(type(backendUrl) == "string", "backendUrl must be a string")
	assert(type(apiKey) == "string", "apiKey must be a string")
	
	BACKEND_URL = backendUrl:gsub("/$", "")
	API_KEY = apiKey
	INITIALIZED = true
	
	print("[RedemptionService] Initialized with backend:", BACKEND_URL)
end

--[[
	Redeem a code for a player
	@param player (Player) - The player redeeming the code
	@param code (string) - The code to redeem
	@return (Promise) - Promise that resolves with reward data or rejects with error message
]]
function RedemptionService.RedeemCode(player, code)
	assert(INITIALIZED, "[RedemptionService] Service not initialized. Call Initialize() first.")
	assert(typeof(player) == "Instance" and player:IsA("Player"), "player must be a Player instance")
	assert(type(code) == "string", "code must be a string")
	
	local promise = {}
	local success = false
	local result = nil
	local errorMsg = nil
	
	local normalizedCode = code:upper():gsub("^%s*(.-)%s*$", "%1")
	
	if normalizedCode == "" then
		errorMsg = "Code cannot be empty"
		promise.success = false
		promise.error = errorMsg
	else
		local url = BACKEND_URL .. "/redeem-code"
		local requestBody = HttpService:JSONEncode({
			code = normalizedCode,
			robloxUserId = tostring(player.UserId)
		})
		
		local requestSuccess, response = pcall(function()
			return HttpService:RequestAsync({
				Url = url,
				Method = "POST",
				Headers = {
					["Content-Type"] = "application/json",
					["x-api-key"] = API_KEY
				},
				Body = requestBody
			})
		end)
		
		if requestSuccess then
			if response.Success then
				local parseSuccess, data = pcall(function()
					return HttpService:JSONDecode(response.Body)
				end)
				
				if parseSuccess and data.ok then
					success = true
					result = data.reward
					promise.success = true
					promise.data = result
					print(string.format("[RedemptionService] Code '%s' redeemed by %s (UserId: %d)", 
						normalizedCode, player.Name, player.UserId))
				else
					errorMsg = data.message or "Invalid response from server"
					promise.success = false
					promise.error = errorMsg
				end
			else
				local parseSuccess, errorData = pcall(function()
					return HttpService:JSONDecode(response.Body)
				end)
				
				if parseSuccess and errorData.error then
					if errorData.error == "code_already_used" then
						errorMsg = "This code has already been redeemed"
					elseif errorData.error == "user_already_redeemed" then
						errorMsg = "You have already redeemed a code and cannot redeem another one"
					elseif response.StatusCode == 404 then
						errorMsg = "Invalid code"
					elseif response.StatusCode == 403 then
						errorMsg = "Server authentication failed"
					else
						errorMsg = errorData.message or "Failed to redeem code"
					end
				else
					errorMsg = string.format("HTTP %d: %s", response.StatusCode, response.StatusMessage)
				end
				
				promise.success = false
				promise.error = errorMsg
			end
		else
			errorMsg = "Failed to connect to redemption server"
			promise.success = false
			promise.error = errorMsg
			warn("[RedemptionService] Request failed:", response)
		end
	end
	
	function promise:andThen(callback)
		if self.success then
			local callSuccess, callResult = pcall(callback, self.data)
			if not callSuccess then
				warn("[RedemptionService] Error in andThen callback:", callResult)
			end
		end
		return self
	end
	
	function promise:catch(callback)
		if not self.success then
			local callSuccess, callResult = pcall(callback, self.error)
			if not callSuccess then
				warn("[RedemptionService] Error in catch callback:", callResult)
			end
		end
		return self
	end
	
	return promise
end

--[[
	Give rewards to a player - CUSTOMIZE THIS FOR YOUR GAME!
	@param player (Player) - The player to give rewards to
	@param reward (table) - The reward data from the backend
]]
function RedemptionService.GiveRewards(player, reward)
	print(string.format("[RedemptionService] Giving rewards to %s:", player.Name))
	print(" - Coins:", reward.coins or 0)
	
	-- CUSTOMIZE: Give coins to your player
	if reward.coins then
		local leaderstats = player:FindFirstChild("leaderstats")
		if leaderstats then
			local coins = leaderstats:FindFirstChild("Coins")
			if coins then
				coins.Value = coins.Value + reward.coins
				print(string.format("  ✅ Gave %d coins to %s", reward.coins, player.Name))
			end
		end
	end
	
	-- CUSTOMIZE: Give items to your player
	if reward.items and #reward.items > 0 then
		-- Implement your item-giving logic here
		print(" - Items:", HttpService:JSONEncode(reward.items))
	end
	
	-- Store Discord ID if you want cross-platform features
	if reward.discordId then
		player:SetAttribute("DiscordID", reward.discordId)
		print(" - Linked Discord ID:", reward.discordId)
	end
end

return RedemptionService

-- =====================================================
-- PART 2: Server Script
-- Location: ServerScriptService.CodeRedemptionHandler
-- =====================================================

--[[
local RedemptionService = require(game.ServerScriptService.RedemptionService)
local Players = game:GetService("Players")

-- ⚠️ IMPORTANT: Replace these with your actual values!
local BACKEND_URL = "https://your-backend-url.com"  -- Your backend URL
local SERVER_SECRET = "your-server-secret-here"     -- From backend/.env

-- Initialize the service
RedemptionService.Initialize(BACKEND_URL, SERVER_SECRET)
print("✅ Code Redemption System initialized!")

-- Create RemoteEvent for client-server communication
local RedeemCodeEvent = Instance.new("RemoteEvent")
RedeemCodeEvent.Name = "RedeemCode"
RedeemCodeEvent.Parent = game.ReplicatedStorage

-- Handle code redemption requests from clients
RedeemCodeEvent.OnServerEvent:Connect(function(player, code)
	-- Validate input
	if type(code) ~= "string" or code == "" then
		RedeemCodeEvent:FireClient(player, {
			success = false,
			message = "Please enter a valid code"
		})
		return
	end
	
	-- Rate limiting (3 second cooldown)
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
	
	-- Attempt redemption
	print(string.format("[Redemption] %s attempting to redeem: %s", player.Name, code))
	
	RedemptionService.RedeemCode(player, code)
		:andThen(function(reward)
			print(string.format("[Redemption] ✅ Success! %s redeemed code", player.Name))
			
			-- Give rewards
			RedemptionService.GiveRewards(player, reward)
			
			-- Notify client
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
			warn(string.format("[Redemption] ❌ Failed for %s: %s", player.Name, errorMessage))
			
			-- User-friendly error messages
			local userMessage = errorMessage
			if errorMessage == "This code has already been redeemed" then
				userMessage = "This code has already been used"
			elseif errorMessage == "You have already redeemed a code and cannot redeem another one" then
				userMessage = "You've already redeemed a code!"
			elseif errorMessage == "Invalid code" then
				userMessage = "Invalid code. Please check and try again."
			elseif errorMessage == "Failed to connect to redemption server" then
				userMessage = "Server error. Please try again later."
			end
			
			-- Notify client
			RedeemCodeEvent:FireClient(player, {
				success = false,
				message = userMessage
			})
		end)
end)
]]

-- =====================================================
-- PART 3: Client GUI Script (LocalScript)
-- Location: StarterGui.ScreenGui.RedemptionFrame.LocalScript
-- =====================================================

--[[
-- GUI Structure needed:
-- ScreenGui
--   └── Frame (named "RedemptionFrame")
--       ├── TextBox (named "CodeInput")
--       ├── TextButton (named "RedeemButton")
--       └── TextLabel (named "StatusMessage")

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")

local player = Players.LocalPlayer
local RedeemCodeEvent = ReplicatedStorage:WaitForChild("RedeemCode")

-- GUI References
local gui = script.Parent
local codeInput = gui:WaitForChild("CodeInput")
local redeemButton = gui:WaitForChild("RedeemButton")
local statusMessage = gui:WaitForChild("StatusMessage")

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
	redeemButton.Text = "Redeeming..."
	statusMessage.Text = "Processing..."
	statusMessage.TextColor3 = Color3.fromRGB(255, 255, 255)
	
	-- Send to server
	RedeemCodeEvent:FireServer(code)
end)

-- Handle server response
RedeemCodeEvent.OnClientEvent:Connect(function(response)
	-- Re-enable button
	redeemButton.Enabled = true
	redeemButton.BackgroundColor3 = Color3.fromRGB(0, 170, 255)
	redeemButton.Text = "Redeem Code"
	
	if response.success then
		-- Success!
		statusMessage.Text = "✅ " .. response.message
		statusMessage.TextColor3 = Color3.fromRGB(100, 255, 100)
		
		-- Clear input
		codeInput.Text = ""
		
		-- Show reward (optional)
		if response.reward and response.reward.coins then
			print(string.format("You received %d coins!", response.reward.coins))
		end
		
		-- Clear message after 5 seconds
		task.wait(5)
		if statusMessage.Text:find("✅") then
			statusMessage.Text = ""
		end
	else
		-- Error
		statusMessage.Text = "❌ " .. response.message
		statusMessage.TextColor3 = Color3.fromRGB(255, 100, 100)
		
		-- Clear message after 5 seconds
		task.wait(5)
		if statusMessage.Text:find("❌") then
			statusMessage.Text = ""
		end
	end
end)

-- Clear status when typing
codeInput:GetPropertyChangedSignal("Text"):Connect(function()
	if statusMessage.Text ~= "Processing..." then
		statusMessage.Text = ""
	end
end)
]]

--[[
==============================================
SETUP INSTRUCTIONS
==============================================

1. Enable HTTP Requests:
   - Game Settings → Security → Allow HTTP Requests ✅

2. Create ModuleScript:
   - ServerScriptService → Insert ModuleScript
   - Name it "RedemptionService"
   - Copy PART 1 code into it

3. Create Server Script:
   - ServerScriptService → Insert Script
   - Name it "CodeRedemptionHandler"
   - Copy PART 2 code (uncommented) into it
   - Update BACKEND_URL and SERVER_SECRET!

4. Create GUI:
   - StarterGui → Insert ScreenGui
   - Add Frame, TextBox, TextButton, TextLabel as shown above
   - Insert LocalScript in the Frame
   - Copy PART 3 code (uncommented) into it

5. Test:
   - Start your backend server
   - Generate a code in Discord with /generate-code
   - Run your Roblox game
   - Enter the code in the GUI
   - Check for rewards!

TROUBLESHOOTING:
- "HTTP requests not enabled" → Check Game Settings
- "Failed to connect" → Verify backend is running and URL is correct
- "Server authentication failed" → Check SERVER_SECRET matches backend
- "Invalid code" → Generate a new code in Discord

For MongoDB setup, see backend/MONGODB_ONLY_SETUP.md
==============================================
]]
