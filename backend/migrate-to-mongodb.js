const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const Code = require('./models/Code');

/**
 * Migration script to migrate code data from data.json to MongoDB
 * 
 * Usage:
 *   node migrate-to-mongodb.js
 * 
 * Make sure MONGO_URI is set in your .env file before running.
 */

async function migrateToMongoDB() {
  try {
    console.log('🔄 Starting migration from data.json to MongoDB...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/endzone-strike', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Load data from JSON file
    const dataFile = path.join(__dirname, 'data.json');
    let data;
    
    try {
      const fileContent = await fs.readFile(dataFile, 'utf8');
      data = JSON.parse(fileContent);
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('⚠️  No data.json file found. Nothing to migrate.');
        await mongoose.connection.close();
        return;
      }
      throw error;
    }

    if (!data.codes || Object.keys(data.codes).length === 0) {
      console.log('⚠️  No codes found in data.json. Nothing to migrate.');
      await mongoose.connection.close();
      return;
    }

    // Clear existing codes in MongoDB (optional - comment out if you want to keep existing data)
    const existingCount = await Code.countDocuments();
    if (existingCount > 0) {
      console.log(`⚠️  Found ${existingCount} existing codes in MongoDB.`);
      console.log('   Skipping deletion. If you want to clear them first, uncomment the deleteMany line.');
      // await Code.deleteMany({});
    }

    // Migrate codes
    const codes = Object.entries(data.codes);
    console.log(`📊 Migrating ${codes.length} codes...`);
    
    let migrated = 0;
    let skipped = 0;
    
    for (const [code, codeData] of codes) {
      try {
        // Check if code already exists
        const exists = await Code.findOne({ code: code.toUpperCase() });
        
        if (exists) {
          console.log(`   ⏭️  Skipping ${code} (already exists)`);
          skipped++;
          continue;
        }

        // Create new code document
        await Code.create({
          code: code.toUpperCase(),
          discordId: codeData.discordId,
          createdAt: new Date(codeData.createdAt),
          redeemed: codeData.redeemed || false,
          robloxUserId: codeData.robloxUserId || null,
          redeemedAt: codeData.redeemedAt ? new Date(codeData.redeemedAt) : null
        });
        
        migrated++;
        if (migrated % 10 === 0) {
          console.log(`   ✅ Migrated ${migrated}/${codes.length} codes...`);
        }
      } catch (error) {
        console.error(`   ❌ Error migrating code ${code}:`, error.message);
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Successfully migrated: ${migrated} codes`);
    console.log(`   ⏭️  Skipped (already exist): ${skipped} codes`);
    console.log(`   ❌ Failed: ${codes.length - migrated - skipped} codes`);

    // Backup the JSON file
    const backupFile = path.join(__dirname, `data.json.backup-${Date.now()}`);
    await fs.copyFile(dataFile, backupFile);
    console.log(`\n💾 Backup created: ${backupFile}`);
    console.log('   You can delete this backup file once you verify the migration.');

    await mongoose.connection.close();
    console.log('\n✅ Migration complete!');
    console.log('\n📝 Next steps:');
    console.log('   1. Verify the migrated data in MongoDB');
    console.log('   2. Update backend/index.js to use the MongoDB version (or rename index-mongodb.js to index.js)');
    console.log('   3. Test the backend with the new MongoDB setup');
    console.log('   4. Once verified, you can delete the data.json file');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateToMongoDB();
