-- CLIENT GUI SCRIPT (LocalScript)
-- Place this LocalScript inside your RedemptionFrame
-- Make sure your GUI has: CodeInput (TextBox), RedeemButton (TextButton), StatusMessage (TextLabel)

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")

local player = Players.LocalPlayer
local RedeemCodeEvent = ReplicatedStorage:WaitForChild("RedeemCode")

-- GUI References - wait for elements
local gui = script.Parent
local codeInput = gui:WaitForChild("CodeInput")
local redeemButton = gui:WaitForChild("RedeemButton")
local statusMessage = gui:WaitForChild("StatusMessage")

print("✅ Code Redemption GUI loaded successfully!")

-- Button click handler
local function onRedeemButtonClick()
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
end

redeemButton.MouseButton1Click:Connect(onRedeemButtonClick)

-- Handle server response
local function onServerResponse(response)
	-- Always re-enable button first
	task.wait(0.1) -- Small delay to ensure GUI is ready
	
	if redeemButton and redeemButton.Parent then
		redeemButton.Enabled = true
		redeemButton.BackgroundColor3 = Color3.fromRGB(0, 170, 255)
		redeemButton.Text = "Redeem Code"
	end
	
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
		task.delay(5, function()
			if statusMessage and statusMessage.Text:find("✅") then
				statusMessage.Text = ""
			end
		end)
	else
		-- Error
		statusMessage.Text = "❌ " .. response.message
		statusMessage.TextColor3 = Color3.fromRGB(255, 100, 100)
		
		-- Clear message after 5 seconds
		task.delay(5, function()
			if statusMessage and statusMessage.Text:find("❌") then
				statusMessage.Text = ""
			end
		end)
	end
end

RedeemCodeEvent.OnClientEvent:Connect(onServerResponse)

-- Clear status when typing
codeInput:GetPropertyChangedSignal("Text"):Connect(function()
	if statusMessage.Text ~= "Processing..." then
		statusMessage.Text = ""
	end
end)

print("✅ Code Redemption System ready!")
