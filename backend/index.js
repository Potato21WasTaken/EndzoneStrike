const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { customAlphabet } = require('nanoid');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

// Generate uppercase alphanumeric codes
const generateCode = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 8);

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Load data from file
async function loadData() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    const parsed = JSON.parse(data);
    // Ensure codes object exists and is safe
    if (!parsed.codes || typeof parsed.codes !== 'object') {
      parsed.codes = Object.create(null);
    }
    // Ensure redeemedUsers array exists
    if (!parsed.redeemedUsers || !Array.isArray(parsed.redeemedUsers)) {
      parsed.redeemedUsers = [];
    }
    return parsed;
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, return empty data with null prototype object
      return { codes: Object.create(null), redeemedUsers: [] };
    }
    throw error;
  }
}

// Save data to file
async function saveData(data) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

// Generate a unique code
async function generateUniqueCode(length = 8) {
  const data = await loadData();
  const codeGenerator = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', length);
  
  let attempts = 0;
  const maxAttempts = 6;
  
  while (attempts < maxAttempts) {
    const code = codeGenerator();
    if (!data.codes[code]) {
      return code;
    }
    attempts++;
  }
  
  throw new Error('Failed to generate unique code after maximum attempts');
}

// POST /create-code - Create a new code for a Discord user
app.post('/create-code', async (req, res) => {
  try {
    // Check authentication
    const botKey = req.headers['x-bot-key'];
    if (!botKey || botKey !== process.env.BOT_SECRET) {
      return res.status(403).json({ 
        error: 'Forbidden', 
        message: 'Invalid or missing x-bot-key header' 
      });
    }

    // Validate request body exists
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ 
        error: 'Bad Request', 
        message: 'Invalid request body' 
      });
    }

    const discordId = req.body.discordId;
    const length = req.body.length;
    
    // Validate input types to prevent type confusion and injection
    if (!discordId || typeof discordId !== 'string') {
      return res.status(400).json({ 
        error: 'Bad Request', 
        message: 'discordId is required and must be a string' 
      });
    }
    
    if (length !== undefined && (typeof length !== 'number' || length < 6 || length > 16)) {
      return res.status(400).json({ 
        error: 'Bad Request', 
        message: 'length must be a number between 6 and 16' 
      });
    }

    const codeLength = length && length >= 6 && length <= 16 ? length : 8;
    const code = await generateUniqueCode(codeLength);
    
    // Store the code
    const data = await loadData();
    data.codes[code] = {
      discordId,
      createdAt: new Date().toISOString(),
      redeemed: false,
      robloxUserId: null,
      redeemedAt: null
    };
    await saveData(data);

    console.log(`✅ Code created: ${code} for Discord user ${discordId}`);
    
    res.status(200).json({ code });
  } catch (error) {
    console.error('Error creating code:', error);
    res.status(500).json({ 
      error: 'Internal Server Error', 
      message: error.message 
    });
  }
});

// POST /redeem-code - Redeem a code for a Roblox user
app.post('/redeem-code', async (req, res) => {
  try {
    // Check authentication
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== process.env.SERVER_SECRET) {
      return res.status(403).json({ 
        error: 'Forbidden', 
        message: 'Invalid or missing x-api-key header' 
      });
    }

    const { code, robloxUserId } = req.body;
    
    // Validate input types to prevent type confusion and injection
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ 
        error: 'Bad Request', 
        message: 'code is required and must be a string' 
      });
    }
    
    if (!robloxUserId || typeof robloxUserId !== 'string') {
      return res.status(400).json({ 
        error: 'Bad Request', 
        message: 'robloxUserId is required and must be a string' 
      });
    }

    // Normalize and validate code format (prevent prototype pollution)
    const normalizedCode = code.toUpperCase().trim();
    
    // Reject codes that could be prototype pollution attempts
    if (normalizedCode === '__PROTO__' || normalizedCode === 'CONSTRUCTOR' || normalizedCode === 'PROTOTYPE') {
      return res.status(400).json({ 
        error: 'Bad Request', 
        message: 'Invalid code format' 
      });
    }

    const data = await loadData();
    
    // Check if this user has already redeemed any code
    if (data.redeemedUsers && data.redeemedUsers.includes(robloxUserId)) {
      return res.status(400).json({ 
        error: 'user_already_redeemed', 
        message: 'You have already redeemed a code and cannot redeem another one'
      });
    }
    
    // Use Object.prototype.hasOwnProperty to safely check for key existence
    if (!Object.prototype.hasOwnProperty.call(data.codes, normalizedCode)) {
      return res.status(404).json({ 
        error: 'Not Found', 
        message: 'Code not found' 
      });
    }
    
    const codeData = data.codes[normalizedCode];
    
    if (!codeData) {
      return res.status(404).json({ 
        error: 'Not Found', 
        message: 'Code not found' 
      });
    }

    if (codeData.redeemed) {
      return res.status(400).json({ 
        error: 'code_already_used', 
        message: 'This code has already been redeemed',
        redeemedBy: codeData.robloxUserId,
        redeemedAt: codeData.redeemedAt
      });
    }

    // Mark as redeemed by creating a new object (prevents prototype pollution)
    const updatedCodeData = {
      discordId: codeData.discordId,
      createdAt: codeData.createdAt,
      redeemed: true,
      robloxUserId: robloxUserId,
      redeemedAt: new Date().toISOString()
    };
    
    // Update the code in the data structure
    data.codes[normalizedCode] = updatedCodeData;
    
    // Add user to redeemed users list
    if (!data.redeemedUsers) {
      data.redeemedUsers = [];
    }
    if (!data.redeemedUsers.includes(robloxUserId)) {
      data.redeemedUsers.push(robloxUserId);
    }
    
    await saveData(data);

    console.log(`✅ Code redeemed: ${normalizedCode} by Roblox user ${robloxUserId}`);

    // Return success with reward data
    res.status(200).json({ 
      ok: true, 
      reward: {
        discordId: updatedCodeData.discordId,
        robloxUserId,
        code: normalizedCode,
        redeemedAt: updatedCodeData.redeemedAt,
        // Add your reward logic here
        coins: 1000,
        items: []
      }
    });
  } catch (error) {
    console.error('Error redeeming code:', error);
    res.status(500).json({ 
      error: 'Internal Server Error', 
      message: error.message 
    });
  }
});

// GET /code-status - Check the status of a code (no authentication required)
app.get('/code-status', async (req, res) => {
  try {
    const { code } = req.query;
    
    // Validate input type
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ 
        error: 'Bad Request', 
        message: 'code query parameter is required and must be a string' 
      });
    }

    // Normalize and validate code format
    const normalizedCode = code.toUpperCase().trim();
    
    // Reject codes that could be prototype pollution attempts
    if (normalizedCode === '__PROTO__' || normalizedCode === 'CONSTRUCTOR' || normalizedCode === 'PROTOTYPE') {
      return res.status(400).json({ 
        error: 'Bad Request', 
        message: 'Invalid code format' 
      });
    }

    const data = await loadData();
    
    // Use Object.prototype.hasOwnProperty to safely check for key existence
    if (!Object.prototype.hasOwnProperty.call(data.codes, normalizedCode)) {
      return res.status(404).json({ 
        error: 'Not Found', 
        message: 'Code not found' 
      });
    }
    
    const codeData = data.codes[normalizedCode];

    // Return limited information (don't expose sensitive data)
    res.status(200).json({
      code: normalizedCode,
      redeemed: codeData.redeemed,
      createdAt: codeData.createdAt,
      redeemedAt: codeData.redeemedAt || null
    });
  } catch (error) {
    console.error('Error checking code status:', error);
    res.status(500).json({ 
      error: 'Internal Server Error', 
      message: error.message 
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', message: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend API running on port ${PORT}`);
  console.log(`📝 Environment:`);
  console.log(`   - BOT_SECRET: ${process.env.BOT_SECRET ? '✅ Set' : '❌ Missing'}`);
  console.log(`   - SERVER_SECRET: ${process.env.SERVER_SECRET ? '✅ Set' : '❌ Missing'}`);
});
