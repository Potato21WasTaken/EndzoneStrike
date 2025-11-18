--[[
=====================================================
COMPLETE ROBLOX CODE REDEMPTION SCRIPTS
Pre-configured for: https://suppler-normand-overpresumptively.ngrok-free.dev
=====================================================

SETUP INSTRUCTIONS:
1. Create a ModuleScript in ReplicatedStorage named "RedemptionService"
   - Copy SCRIPT 1 below into it

2. Create a Script in ServerScriptService named "CodeRedemptionHandler"
   - Copy SCRIPT 2 below into it

3. Create your GUI in StarterGui:
   ScreenGui
     └── RedemptionFrame (Frame)
         ├── CodeInput (TextBox)
         ├── RedeemButton (TextButton)
         ├── StatusMessage (TextLabel)
         └── LocalScript (copy SCRIPT 3 into it)

4. Make sure HttpService is enabled:
   - Go to Game Settings > Security
   - Enable "Allow HTTP Requests"

That's it! You're ready to go.
=====================================================
]]

--[[
=====================================================
SCRIPT 1: ModuleScript
Location: ReplicatedStorage > RedemptionService
=====================================================
]]

local HttpService = game:GetService("HttpService")

local RedemptionService = {}
RedemptionService.BackendURL = nil
RedemptionService.ServerSecret = nil

function RedemptionService:Init(backendURL, serverSecret)
	self.BackendURL = backendURL
	self.ServerSecret = serverSecret
	print("[RedemptionService] Initialized with backend:", backendURL)
end

function RedemptionService:RedeemCode(code, robloxUserId)
	if not self.BackendURL then
		return {success = false, error = "not_initialized"}
	end
	
	local url = self.BackendURL .. "/redeem-code"
	
	local requestData = {
		Url = url,
		Method = "POST",
		Headers = {
			["Content-Type"] = "application/json",
			["Authorization"] = "Bearer " .. self.ServerSecret
		},
		Body = HttpService:JSONEncode({
			code = code,
			robloxUserId = tostring(robloxUserId)
		})
	}
	
	local success, response = pcall(function()
		return HttpService:RequestAsync(requestData)
	end)
	
	if not success then
		warn("[RedemptionService] HTTP Error:", response)
		return {success = false, error = "network_error", message = tostring(response)}
	end
	
	if response.StatusCode ~= 200 then
		local errorData = HttpService:JSONDecode(response.Body)
		warn("[RedemptionService] Server returned error:", errorData.error)
		return {success = false, error = errorData.error, message = errorData.message}
	end
	
	local data = HttpService:JSONDecode(response.Body)
	return {success = true, data = data}
end

return RedemptionService


--[[
=====================================================
SCRIPT 2: Server Script
Location: ServerScriptService > CodeRedemptionHandler
=====================================================
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RedemptionService = require(ReplicatedStorage:WaitForChild("RedemptionService"))

-- IMPORTANT: Update this with your backend URL and secret
local BACKEND_URL = "https://suppler-normand-overpresumptively.ngrok-free.dev"
local SERVER_SECRET = "your-secret-key-here"  -- Get this from your backend/.env file

-- Initialize the service
RedemptionService:Init(BACKEND_URL, SERVER_SECRET)

print("✅ Code Redemption System initialized!")

-- Create RemoteEvent for client-server communication
local RedeemCodeEvent = Instance.new("RemoteEvent")
RedeemCodeEvent.Name = "RedeemCodeEvent"
RedeemCodeEvent.Parent = ReplicatedStorage

-- Handle code redemption requests from clients
RedeemCodeEvent.OnServerEvent:Connect(function(player, code)
	print("[Server] Redemption request from", player.Name, "for code:", code)
	
	if not code or type(code) ~= "string" or #code == 0 then
		RedeemCodeEvent:FireClient(player, {
			success = false,
			error = "invalid_code",
			message = "Please enter a valid code"
		})
		return
	end
	
	-- Call backend to redeem code
	local result = RedemptionService:RedeemCode(code, player.UserId)
	
	-- Send result back to client
	RedeemCodeEvent:FireClient(player, result)
end)


--[[
=====================================================
SCRIPT 3: LocalScript
Location: StarterGui > ScreenGui > RedemptionFrame > LocalScript
=====================================================
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")

-- Wait for the RemoteEvent
local RedeemCodeEvent = ReplicatedStorage:WaitForChild("RedeemCodeEvent")

-- Get GUI elements
local gui = script.Parent
local codeInput = gui:WaitForChild("CodeInput")
local redeemButton = gui:WaitForChild("RedeemButton")
local statusMessage = gui:WaitForChild("StatusMessage")

-- Set initial status
statusMessage.Text = "Ready to redeem code!"
statusMessage.TextColor3 = Color3.fromRGB(255, 255, 255)

-- Handle button click
redeemButton.MouseButton1Click:Connect(function()
	local code = codeInput.Text
	
	if code == "" then
		statusMessage.Text = "❌ Please enter a code"
		statusMessage.TextColor3 = Color3.fromRGB(255, 0, 0)
		return
	end
	
	-- Show loading state (no .Enabled property - Roblox removed it)
	redeemButton.Text = "Redeeming..."
	redeemButton.BackgroundColor3 = Color3.fromRGB(100, 100, 100)
	statusMessage.Text = "Checking code..."
	statusMessage.TextColor3 = Color3.fromRGB(255, 255, 0)
	
	-- Send request to server
	RedeemCodeEvent:FireServer(code)
end)

-- Handle server response
RedeemCodeEvent.OnClientEvent:Connect(function(response)
	-- Reset button
	redeemButton.Text = "Redeem Code"
	redeemButton.BackgroundColor3 = Color3.fromRGB(0, 170, 255)
	
	if response.success then
		-- Success!
		statusMessage.Text = "✅ Code redeemed successfully!"
		statusMessage.TextColor3 = Color3.fromRGB(0, 255, 0)
		codeInput.Text = ""
		
		-- You can add reward logic here
		print("Rewards:", response.data.rewards)
		
	else
		-- Error handling
		local errorMessages = {
			invalid_code = "❌ Invalid code",
			code_already_used = "❌ This code has already been used",
			user_already_redeemed = "❌ You have already redeemed a code",
			network_error = "❌ Connection error. Try again",
			not_initialized = "❌ System not ready. Try again"
		}
		
		local message = errorMessages[response.error] or "❌ " .. (response.message or "Unknown error")
		statusMessage.Text = message
		statusMessage.TextColor3 = Color3.fromRGB(255, 0, 0)
		
		print("Redemption error:", response.error, response.message)
	end
end)


--[[
=====================================================
TROUBLESHOOTING
=====================================================

1. "HttpService is not allowed" error:
   - Enable HTTP in Game Settings > Security

2. "Invalid code" error:
   - Make sure you generated a code from Discord first
   - Code might have expired or been used

3. "You have already redeemed a code" error:
   - This is working as intended! Each user can only redeem ONE code total

4. "Connection error":
   - Make sure your backend is running
   - Check your ngrok URL is correct in SCRIPT 2
   - ngrok URLs change when you restart ngrok

5. Button doesn't do anything:
   - Check Output window for errors
   - Make sure all 3 scripts are in the correct locations
   - Verify GUI structure matches the setup instructions

6. How to test:
   - Generate a code in Discord
   - Enter it in the Roblox game
   - Click Redeem Code
   - Should see success message

=====================================================
]]
