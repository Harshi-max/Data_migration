import { MongoClient } from 'mongodb';

const uri = process.argv[2];

if (!uri) {
  console.error('❗ Usage: node test_mongo.mjs <mongodb-uri>');
  console.error('   Example: node test_mongo.mjs "mongodb+srv://user:pass@cluster.mongodb.net/dbname"');
  process.exit(1);
}

async function testConnection() {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });

  try {
    console.log('🔌 Connecting to MongoDB Atlas...');
    await client.connect();
    console.log('✅ Connected successfully!\n');

    // List all databases
    const adminDb = client.db().admin();
    const dbList = await adminDb.listDatabases();
    console.log('📂 Available Databases:');
    dbList.databases.forEach(db => {
      console.log(`   - ${db.name}  (${(db.sizeOnDisk / 1024).toFixed(2)} KB)`);
    });

    // Focus on exam_app
    const db = client.db('exam_app');
    const collections = await db.listCollections().toArray();
    console.log(`\n📋 Collections in 'exam_app':`);
    if (collections.length === 0) {
      console.log('   (no collections found)');
    } else {
      for (const col of collections) {
        const count = await db.collection(col.name).countDocuments();
        console.log(`   - ${col.name}  (${count} documents)`);
      }
    }

    // Ping check
    await db.command({ ping: 1 });
    console.log('\n🏓 Ping: OK');

  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n🔒 Connection closed.');
  }
}

testConnection();
