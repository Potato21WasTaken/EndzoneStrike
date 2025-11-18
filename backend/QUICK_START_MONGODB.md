# Quick Start: Switching to MongoDB

Yes! You can absolutely switch to MongoDB instead of using a JSON file. MongoDB is **highly recommended** for production use, especially if you expect many users.

## Why Switch to MongoDB?

- ✅ **Handles thousands of users** efficiently
- ✅ **Faster performance** (queries are 20-50x faster)
- ✅ **No file corruption risk** with concurrent access
- ✅ **Free tier** available on MongoDB Atlas
- ✅ **Automatic backups** and replication

## Quick Setup (5 minutes)

### 1. Get MongoDB (Choose One)

**Option A: MongoDB Atlas (Recommended - Cloud, Free)**
1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up for free
3. Create a free cluster
4. Click "Connect" → Copy connection string
5. Looks like: `mongodb+srv://username:password@cluster.mongodb.net/`

**Option B: Local MongoDB**
1. Install from https://www.mongodb.com/try/download/community
2. Use: `mongodb://localhost:27017/endzone-strike`

### 2. Add to Environment

Edit `backend/.env`:
```env
PORT=3000
BOT_SECRET=your-bot-secret-here
SERVER_SECRET=your-server-secret-here
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/endzone-strike
```

### 3. Install Dependencies

```bash
cd backend
npm install mongoose
```

### 4. Migrate Existing Codes (if any)

If you already have codes in `data.json`:
```bash
node migrate-to-mongodb.js
```

This safely copies all codes to MongoDB and creates a backup.

### 5. Switch to MongoDB

**Option A: Rename files**
```bash
mv index.js index-json.js
mv index-mongodb.js index.js
```

**Option B: Update package.json start script**
```json
{
  "scripts": {
    "start": "node index-mongodb.js"
  }
}
```

### 6. Start the Server

```bash
npm start
```

You should see:
```
✅ Connected to MongoDB
🚀 Backend API running on port 3000
```

## That's It!

Your backend now uses MongoDB. All the same endpoints work exactly the same way - Discord bot and Roblox don't need any changes!

## Need Help?

- Full guide: See `backend/MONGODB_MIGRATION.md`
- Comparison: See `backend/STORAGE_COMPARISON.md`
- Issues: Check the troubleshooting section in the migration guide

## Can I Switch Back?

Yes! Just rename the files back:
```bash
mv index.js index-mongodb.js
mv index-json.js index.js
```

Your `data.json` backup is preserved, so you can always revert.
