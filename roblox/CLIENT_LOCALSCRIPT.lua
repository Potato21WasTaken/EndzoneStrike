--[[
=================================================================
CODE REDEMPTION CLIENT SCRIPT - WITH EXTENSIVE DEBUGGING
=================================================================
PLACEMENT INSTRUCTIONS:
1. In Roblox Studio Explorer, find: StarterGui > ScreenGui > RedemptionFrame
2. Right-click RedemptionFrame and select "Insert Object" > "LocalScript"
3. Delete ALL code in the LocalScript and paste THIS ENTIRE FILE
4. Make sure RedemptionFrame contains:
   - CodeInput (TextBox)
   - RedeemButton (TextButton)
   - StatusMessage (TextLabel)

If you get errors, check the Output window for DEBUG messages!
=================================================================
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")

print("========== CODE REDEMPTION SCRIPT STARTING ==========")
print("DEBUG: Script location:", script:GetFullName())
print("DEBUG: Parent:", script.Parent and script.Parent.Name or "NO PARENT")

local player = Players.LocalPlayer
print("DEBUG: Player:", player.Name)

-- Wait for RemoteEvent
print("DEBUG: Waiting for RedeemCode RemoteEvent...")
local RedeemCodeEvent = ReplicatedStorage:WaitForChild("RedeemCode", 10)
if not RedeemCodeEvent then
	error("FATAL: RedeemCode RemoteEvent not found! Make sure server script is running.")
end
print("DEBUG: RedeemCode RemoteEvent found!")

-- Get GUI parent
local gui = script.Parent
print("DEBUG: GUI Parent Name:", gui.Name)
print("DEBUG: GUI Parent ClassName:", gui.ClassName)

-- Wait for GUI elements with debugging
print("DEBUG: Looking for GUI elements...")
local codeInput = gui:WaitForChild("CodeInput", 5)
if not codeInput then error("FATAL: CodeInput not found!") end
print("DEBUG: CodeInput found - Type:", codeInput.ClassName)

local redeemButton = gui:WaitForChild("RedeemButton", 5)
if not redeemButton then error("FATAL: RedeemButton not found!") end
print("DEBUG: RedeemButton found - Type:", redeemButton.ClassName)

local statusMessage = gui:WaitForChild("StatusMessage", 5)
if not statusMessage then error("FATAL: StatusMessage not found!") end
print("DEBUG: StatusMessage found - Type:", statusMessage.ClassName)

print("✅ All GUI elements loaded successfully!")

-- Store references to prevent garbage collection
_G.CodeRedemptionRefs = {
	codeInput = codeInput,
	redeemButton = redeemButton,
	statusMessage = statusMessage,
	RedeemCodeEvent = RedeemCodeEvent
}

-- Button click handler
local function onRedeemButtonClick()
	print("DEBUG: Button clicked!")
	
	local code = codeInput.Text
	print("DEBUG: Code entered:", code)
	
	-- Validate input
	if code == "" or code:match("^%s*$") then
		print("DEBUG: Empty code")
		statusMessage.Text = "Please enter a code"
		statusMessage.TextColor3 = Color3.fromRGB(255, 100, 100)
		return
	end
	
	print("DEBUG: Disabling button...")
	-- Disable button while processing - wrapped in pcall
	local success, err = pcall(function()
		redeemButton.Enabled = false
		redeemButton.BackgroundColor3 = Color3.fromRGB(100, 100, 100)
		redeemButton.Text = "Redeeming..."
		statusMessage.Text = "Processing..."
		statusMessage.TextColor3 = Color3.fromRGB(255, 255, 255)
	end)
	
	if not success then
		warn("ERROR disabling button:", err)
	else
		print("DEBUG: Button disabled successfully")
	end
	
	print("DEBUG: Firing server event...")
	RedeemCodeEvent:FireServer(code)
	print("DEBUG: Server event fired!")
end

print("DEBUG: Connecting button click...")
redeemButton.MouseButton1Click:Connect(onRedeemButtonClick)
print("DEBUG: Button click connected!")

-- Handle server response
local function onServerResponse(response)
	print("DEBUG: Server response received!")
	print("DEBUG: Response success:", response.success)
	print("DEBUG: Response message:", response.message)
	
	-- Small delay
	task.wait(0.1)
	
	print("DEBUG: Re-enabling button...")
	-- Re-enable button - wrapped in pcall
	local success, err = pcall(function()
		if redeemButton and redeemButton.Parent then
			redeemButton.Enabled = true
			redeemButton.BackgroundColor3 = Color3.fromRGB(0, 170, 255)
			redeemButton.Text = "Redeem Code"
			print("DEBUG: Button re-enabled successfully")
		else
			warn("DEBUG: Button or parent is nil!")
		end
	end)
	
	if not success then
		warn("ERROR re-enabling button:", err)
	end
	
	if response.success then
		print("DEBUG: Success response - updating UI")
		statusMessage.Text = "✅ " .. response.message
		statusMessage.TextColor3 = Color3.fromRGB(100, 255, 100)
		codeInput.Text = ""
		
		if response.reward and response.reward.coins then
			print(string.format("You received %d coins!", response.reward.coins))
		end
		
		task.delay(5, function()
			if statusMessage and statusMessage.Text:find("✅") then
				statusMessage.Text = ""
			end
		end)
	else
		print("DEBUG: Error response - updating UI")
		statusMessage.Text = "❌ " .. response.message
		statusMessage.TextColor3 = Color3.fromRGB(255, 100, 100)
		
		task.delay(5, function()
			if statusMessage and statusMessage.Text:find("❌") then
				statusMessage.Text = ""
			end
		end)
	end
end

print("DEBUG: Connecting server response handler...")
RedeemCodeEvent.OnClientEvent:Connect(onServerResponse)
print("DEBUG: Server response handler connected!")

-- Clear status when typing
codeInput:GetPropertyChangedSignal("Text"):Connect(function()
	if statusMessage.Text ~= "Processing..." then
		statusMessage.Text = ""
	end
end)

print("========== ✅ CODE REDEMPTION SYSTEM READY! ==========")
print("If you see this message, the script loaded correctly.")
print("Try entering a code and clicking the button.")
