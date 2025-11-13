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
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, return empty data
      return { codes: {} };
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

    const { discordId, length } = req.body;
    
    if (!discordId) {
      return res.status(400).json({ 
        error: 'Bad Request', 
        message: 'discordId is required' 
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
    
    if (!code || !robloxUserId) {
      return res.status(400).json({ 
        error: 'Bad Request', 
        message: 'code and robloxUserId are required' 
      });
    }

    const data = await loadData();
    const codeData = data.codes[code.toUpperCase()];

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

    // Mark as redeemed
    codeData.redeemed = true;
    codeData.robloxUserId = robloxUserId;
    codeData.redeemedAt = new Date().toISOString();
    await saveData(data);

    console.log(`✅ Code redeemed: ${code} by Roblox user ${robloxUserId}`);

    // Return success with reward data
    res.status(200).json({ 
      ok: true, 
      reward: {
        discordId: codeData.discordId,
        robloxUserId,
        code,
        redeemedAt: codeData.redeemedAt,
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
    
    if (!code) {
      return res.status(400).json({ 
        error: 'Bad Request', 
        message: 'code query parameter is required' 
      });
    }

    const data = await loadData();
    const codeData = data.codes[code.toUpperCase()];

    if (!codeData) {
      return res.status(404).json({ 
        error: 'Not Found', 
        message: 'Code not found' 
      });
    }

    // Return limited information (don't expose sensitive data)
    res.status(200).json({
      code: code.toUpperCase(),
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
