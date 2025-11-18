# MongoDB Migration Guide

This guide will help you migrate the code redemption system from JSON file storage to MongoDB for better scalability and performance.

## Why MongoDB?

- **Scalability**: Handles thousands of users efficiently
- **Performance**: Faster lookups with indexed queries
- **Reliability**: Built-in data integrity and ACID transactions
- **Concurrent Access**: Better handling of simultaneous requests
- **Advanced Queries**: Easy to add analytics and reporting

## Prerequisites

- MongoDB installed locally OR MongoDB Atlas account (recommended)
- Node.js 18+
- Mongoose package (already in dependencies)

## Setup MongoDB

### Option 1: MongoDB Atlas (Cloud - Recommended)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account and cluster
3. Click "Connect" → "Connect your application"
4. Copy the connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/`)
5. Add to your `backend/.env`:
   ```env
   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/endzone-strike?retryWrites=true&w=majority
   ```

### Option 2: Local MongoDB

1. Install MongoDB locally: https://www.mongodb.com/try/download/community
2. Start MongoDB service
3. Add to your `backend/.env`:
   ```env
   MONGO_URI=mongodb://localhost:27017/endzone-strike
   ```

## Migration Steps

### Step 1: Install Dependencies

```bash
cd backend
npm install mongoose
```

### Step 2: Add MongoDB URI to Environment

Edit `backend/.env`:
```env
PORT=3000
BOT_SECRET=your-bot-secret-here
SERVER_SECRET=your-server-secret-here
MONGO_URI=your-mongodb-connection-string-here
```

### Step 3: Run Migration Script

This will migrate all existing codes from `data.json` to MongoDB:

```bash
cd backend
node migrate-to-mongodb.js
```

The script will:
- Connect to MongoDB
- Read all codes from `data.json`
- Insert them into MongoDB
- Create a backup of `data.json`
- Show migration summary

### Step 4: Switch to MongoDB Backend

**Option A: Replace the main file**
```bash
cd backend
mv index.js index-json.js
mv index-mongodb.js index.js
```

**Option B: Update package.json**
Edit `backend/package.json`:
```json
{
  "scripts": {
    "start": "node index-mongodb.js",
    "start:json": "node index-json.js"
  }
}
```

### Step 5: Test the Backend

```bash
npm start
```

You should see:
```
✅ Connected to MongoDB
🚀 Backend API running on port 3000
📝 Environment:
   - BOT_SECRET: ✅ Set
   - SERVER_SECRET: ✅ Set
   - MONGO_URI: ✅ Set
```

### Step 6: Test Endpoints

Create a code:
```bash
curl -X POST http://localhost:3000/create-code \
  -H "x-bot-key: your-bot-secret" \
  -H "Content-Type: application/json" \
  -d '{"discordId":"123456789"}'
```

Redeem a code:
```bash
curl -X POST http://localhost:3000/redeem-code \
  -H "x-api-key: your-server-secret" \
  -H "Content-Type: application/json" \
  -d '{"code":"YOUR_CODE","robloxUserId":"987654321"}'
```

### Step 7: Verify Data

Check MongoDB to ensure all codes were migrated:
- MongoDB Atlas: Use the web interface
- Local MongoDB: Use MongoDB Compass or `mongosh`

## Rollback (If Needed)

If you need to rollback to JSON:

1. Stop the backend
2. Restore the original index.js:
   ```bash
   mv index-json.js index.js
   ```
3. Your data.json backup is available in the backend folder
4. Restart the backend

## Data Structure in MongoDB

### Code Collection

```javascript
{
  _id: ObjectId("..."),
  code: "ABC12XYZ",              // Unique, uppercase
  discordId: "123456789",        // Discord user who generated
  createdAt: ISODate("..."),     // Creation timestamp
  redeemed: false,               // Whether code is used
  robloxUserId: null,            // Roblox user who redeemed (or null)
  redeemedAt: null               // Redemption timestamp (or null)
}
```

### Indexes

- `code`: Unique index for fast lookups
- `robloxUserId`: Index for checking user redemptions

## Performance Benefits

| Operation | JSON File | MongoDB |
|-----------|-----------|---------|
| Code lookup | O(n) | O(1) with index |
| User check | O(n) | O(1) with index |
| Concurrent writes | ⚠️ Risk of corruption | ✅ Safe |
| Max users | ~1,000 | Millions |
| Query speed (10k codes) | ~100ms | ~1ms |

## Monitoring

Check database status:
```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Maintenance

### View All Codes (MongoDB Compass or mongosh)

```javascript
db.codes.find()
```

### Count Codes

```javascript
db.codes.countDocuments()
```

### Find Redeemed Codes

```javascript
db.codes.find({ redeemed: true })
```

### Check User Redemptions

```javascript
db.codes.findOne({ robloxUserId: "987654321", redeemed: true })
```

## Security Best Practices

### Rate Limiting (Recommended for Production)

For production deployments, consider adding rate limiting to prevent abuse:

```bash
npm install express-rate-limit
```

Then in `index-mongodb.js`:
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/create-code', limiter);
app.use('/redeem-code', limiter);
```

### Other Security Measures

- Use HTTPS in production
- Keep BOT_SECRET and SERVER_SECRET secure
- Regularly update dependencies
- Monitor for suspicious activity
- Consider IP whitelisting for sensitive endpoints

## Troubleshooting

### "Failed to connect to MongoDB"

- Check your MONGO_URI is correct
- Ensure MongoDB is running (if local)
- Check network access (if using Atlas)

### "Duplicate key error"

- Code already exists in database
- This is normal during migration if you run it twice

### "Migration shows 0 codes"

- Check that `data.json` exists in the backend folder
- Verify the file has a `codes` object

## Cost Considerations

### MongoDB Atlas Free Tier

- 512 MB storage
- Shared cluster
- Free forever
- Perfect for small to medium Discord bots

**Estimated capacity:**
- ~500,000 code redemptions
- More than enough for most Discord servers

## Next Steps

After migration:

1. ✅ Keep the `data.json.backup-*` file for a few days
2. ✅ Monitor the backend logs for any issues
3. ✅ Test code generation and redemption thoroughly
4. ✅ Once verified, delete the old `data.json` file
5. ✅ Update your deployment to use the MongoDB version

## Support

If you encounter issues:

1. Check the backend logs
2. Verify your MONGO_URI is correct
3. Ensure MongoDB is accessible
4. Check the troubleshooting section above

## Keeping Both Options

You can keep both JSON and MongoDB versions:

**JSON version**: `index-json.js`
**MongoDB version**: `index-mongodb.js`

Switch between them by changing the start script in package.json or renaming files.
