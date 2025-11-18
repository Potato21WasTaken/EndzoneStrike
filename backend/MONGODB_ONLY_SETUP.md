# MongoDB-Only Setup (Clean Version)

If you're 100% committed to using MongoDB, you can simplify your backend setup by removing the JSON-related files.

## Files to Delete (Safe to Remove)

After you've successfully migrated to MongoDB and verified everything works:

```bash
cd backend

# Delete the JSON version
rm index.js

# Delete migration tools (after migration is complete)
rm migrate-to-mongodb.js

# Delete comparison docs (optional - you may want to keep for reference)
rm STORAGE_COMPARISON.md
rm QUICK_START_MONGODB.md

# Rename MongoDB version to be the main file
mv index-mongodb.js index.js
```

## Files to Keep

**Keep these files:**
- ✅ `index.js` (renamed from index-mongodb.js)
- ✅ `models/Code.js` (required for MongoDB)
- ✅ `package.json` (updated with mongoose)
- ✅ `README.md` (documentation)
- ✅ `MONGODB_MIGRATION.md` (useful reference)
- ✅ `.env` (your secrets)

## Clean Start Commands

After cleanup:

```bash
# Install dependencies
npm install

# Make sure .env has MONGO_URI
echo "MONGO_URI=your-mongodb-connection-string" >> .env

# Start the server
npm start
```

## What Gets Deleted

1. **index.js** (old JSON version) → Replaced by index-mongodb.js
2. **migrate-to-mongodb.js** → Only needed once for migration
3. **STORAGE_COMPARISON.md** → Reference material (optional)
4. **QUICK_START_MONGODB.md** → You're already using MongoDB (optional)

## .gitignore

The following are already in .gitignore (automatically excluded):
- `data.json` (JSON database file)
- `*.backup` (backup files)
- `node_modules/`
- `.env`

## Simplified Structure

After cleanup, your backend folder will look like:

```
backend/
├── models/
│   └── Code.js              # Mongoose schema
├── index.js                 # MongoDB backend (renamed from index-mongodb.js)
├── package.json             # Dependencies
├── .env                     # Your secrets (not in git)
├── README.md                # Documentation
└── MONGODB_MIGRATION.md     # Reference (optional to keep)
```

## Migration Checklist

Before deleting files:

- [ ] MongoDB is set up and running
- [ ] MONGO_URI is in .env
- [ ] Migration completed successfully (if you had existing codes)
- [ ] Backend tested and working with MongoDB
- [ ] Discord bot can create codes
- [ ] Roblox can redeem codes
- [ ] Backup of old data.json exists (if applicable)

## Quick Cleanup Script

Run this after verifying MongoDB works:

```bash
cd backend

# Backup first (just in case)
mkdir -p ../backup-json-version
cp index.js ../backup-json-version/ 2>/dev/null || true
cp migrate-to-mongodb.js ../backup-json-version/ 2>/dev/null || true

# Clean up
rm -f index.js migrate-to-mongodb.js STORAGE_COMPARISON.md QUICK_START_MONGODB.md

# Use MongoDB as main
mv index-mongodb.js index.js

echo "✅ Cleanup complete! MongoDB is now your only backend."
```

## Reverting (If Needed)

If you need to go back to JSON:

1. The backup exists in `../backup-json-version/`
2. Copy it back: `cp ../backup-json-version/index.js ./`
3. Remove MONGO_URI from .env
4. Restart backend

But honestly, stick with MongoDB - it's better for production! 🚀
