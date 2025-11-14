/**
 * Database Migration Script
 * Assigns userId to existing devices
 * 
 * Run: node migrate-devices.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { Device, User } = require('./src/models');

async function migrateDevices() {
  try {
    console.log('🔄 Starting device migration...\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find first admin user
    const admin = await User.findOne({ role: 'admin' });
    
    if (!admin) {
      throw new Error('❌ No admin user found. Please create an admin user first.');
    }

    console.log(`📋 Found admin user: ${admin.username} (${admin.email})\n`);

    // Find devices without userId
    const devicesWithoutUser = await Device.countDocuments({ 
      userId: { $exists: false } 
    });

    if (devicesWithoutUser === 0) {
      console.log('✅ All devices already have userId assigned. No migration needed.\n');
      mongoose.disconnect();
      return;
    }

    console.log(`📊 Found ${devicesWithoutUser} devices without userId\n`);

    // Assign all devices to admin with default deviceType
    const crypto = require('crypto');
    
    const devicesToUpdate = await Device.find({ userId: { $exists: false } });
    
    for (const device of devicesToUpdate) {
      // Generate device token if missing
      if (!device.deviceToken) {
        device.deviceToken = crypto.randomBytes(32).toString('hex');
      }
      
      device.userId = admin._id;
      device.deviceType = device.deviceType || 'door-lock';
      
      await device.save();
      console.log(`  ✓ Migrated device: ${device.name} (${device.espId})`);
    }

    console.log(`\n✅ Successfully migrated ${devicesWithoutUser} devices to user ${admin.username}\n`);
    
    // Show summary
    const summary = await Device.aggregate([
      {
        $group: {
          _id: '$userId',
          count: { $sum: 1 },
          devices: { $push: { name: '$name', espId: '$espId' } }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      }
    ]);

    console.log('📊 Device ownership summary:');
    for (const group of summary) {
      const user = group.user[0];
      console.log(`\n  User: ${user.username} (${user.email})`);
      console.log(`  Devices: ${group.count}`);
      group.devices.forEach(d => {
        console.log(`    - ${d.name} (${d.espId})`);
      });
    }

    console.log('\n✨ Migration complete!\n');
    
    mongoose.disconnect();
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    mongoose.disconnect();
    process.exit(1);
  }
}

// Run migration
migrateDevices();
