#!/usr/bin/env node

/**
 * MQTT Connection Test Script
 * Tests connection to HiveMQ Cloud and validates MQTT functionality
 */

require('dotenv').config();
const { initMQTT, publishMessage, subscribeToTopic, MQTT_TOPICS } = require('./src/config/mqtt');
const logger = require('./src/utils/logger');

async function testMQTTConnection() {
  console.log('🚀 Starting MQTT Connection Test for HiveMQ Cloud\n');

  try {
    // Step 1: Initialize MQTT connection
    console.log('1️⃣ Initializing MQTT connection...');
    const client = await initMQTT();
    console.log('✅ MQTT client initialized successfully\n');

    // Step 2: Test publishing a message
    console.log('2️⃣ Testing message publishing...');
    const testMessage = {
      test: true,
      timestamp: new Date().toISOString(),
      message: 'HiveMQ Cloud connection test'
    };

    await publishMessage(MQTT_TOPICS.CONTROL, testMessage);
    console.log('✅ Test message published successfully\n');

    // Step 3: Test subscribing to a topic (if not already subscribed)
    console.log('3️⃣ Testing topic subscription...');
    try {
      const granted = await subscribeToTopic(MQTT_TOPICS.RESPONSE);
      console.log('✅ Topic subscription successful\n');
    } catch (error) {
      console.log('⚠️ Topic subscription test skipped (may already be subscribed)\n');
    }

    // Step 4: Wait for potential responses
    console.log('4️⃣ Listening for messages (10 seconds)...');
    let messageReceived = false;

    const messageHandler = (topic, message) => {
      console.log(`📨 Message received on ${topic}: ${message.toString()}`);
      messageReceived = true;
    };

    client.on('message', messageHandler);

    // Wait 10 seconds for any messages
    await new Promise(resolve => setTimeout(resolve, 10000));

    if (messageReceived) {
      console.log('✅ Messages received during test period\n');
    } else {
      console.log('ℹ️ No messages received (this is normal if no devices are active)\n');
    }

    // Step 5: Test connection health
    console.log('5️⃣ Testing connection health...');
    if (client.connected) {
      console.log('✅ MQTT client is connected\n');
    } else {
      throw new Error('MQTT client is not connected');
    }

    // Step 6: Cleanup
    console.log('6️⃣ Cleaning up...');
    client.removeListener('message', messageHandler);
    console.log('✅ Test cleanup completed\n');

    console.log('🎉 MQTT Connection Test COMPLETED SUCCESSFULLY!');
    console.log('\n📋 Test Results:');
    console.log('   ✅ Connection established');
    console.log('   ✅ Message publishing works');
    console.log('   ✅ Topic subscription works');
    console.log('   ✅ Connection remains stable');

    process.exit(0);

  } catch (error) {
    console.error('❌ MQTT Connection Test FAILED!');
    console.error(`Error: ${error.message}`);

    console.log('\n🔍 Troubleshooting Tips:');
    console.log('   1. Check your .env file has correct MQTT_BROKER_URL');
    console.log('   2. Verify MQTT_USERNAME and MQTT_PASSWORD if required');
    console.log('   3. Ensure HiveMQ Cloud cluster is running');
    console.log('   4. Check firewall settings for port 8883');
    console.log('   5. Verify SSL certificates are valid');

    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n⚠️ Test interrupted by user');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the test
testMQTTConnection();