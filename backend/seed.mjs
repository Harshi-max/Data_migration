import { MongoClient } from 'mongodb';

const uri = 'mongodb://127.0.0.1:27017';
const client = new MongoClient(uri);

async function seed() {
  try {
    await client.connect();
    const db = client.db('finance-test-utils');

    // ---------- users ----------
    await db.collection('users').deleteMany({});
    await db.collection('users').insertMany([
      { name: 'Alice Johnson', email: 'alice@example.com', age: 29, role: 'admin',   balance: 5400.50,  createdAt: new Date('2024-01-15') },
      { name: 'Bob Smith',     email: 'bob@example.com',   age: 34, role: 'user',    balance: 1200.00,  createdAt: new Date('2024-02-20') },
      { name: 'Carol White',   email: 'carol@example.com', age: 27, role: 'user',    balance: 8750.75,  createdAt: new Date('2024-03-10') },
      { name: 'David Lee',     email: 'david@example.com', age: 41, role: 'manager', balance: 23000.00, createdAt: new Date('2024-01-05') },
      { name: 'Eva Brown',     email: 'eva@example.com',   age: 31, role: 'user',    balance: 340.25,   createdAt: new Date('2024-04-01') },
    ]);
    console.log('✅ users: 5 docs inserted');

    // ---------- records ----------
    await db.collection('records').deleteMany({});
    await db.collection('records').insertMany([
      { userId: 'alice@example.com', type: 'credit', amount: 1500.00, description: 'Salary',         date: new Date('2024-06-01') },
      { userId: 'alice@example.com', type: 'debit',  amount: 200.00,  description: 'Grocery',        date: new Date('2024-06-03') },
      { userId: 'bob@example.com',   type: 'credit', amount: 800.00,  description: 'Freelance',      date: new Date('2024-06-05') },
      { userId: 'bob@example.com',   type: 'debit',  amount: 150.00,  description: 'Electric bill',  date: new Date('2024-06-07') },
      { userId: 'carol@example.com', type: 'credit', amount: 5000.00, description: 'Investment',     date: new Date('2024-06-10') },
      { userId: 'carol@example.com', type: 'debit',  amount: 99.99,   description: 'Subscription',   date: new Date('2024-06-12') },
      { userId: 'david@example.com', type: 'credit', amount: 12000.00,description: 'Bonus',          date: new Date('2024-06-15') },
      { userId: 'eva@example.com',   type: 'debit',  amount: 50.00,   description: 'Coffee & snacks',date: new Date('2024-06-18') },
    ]);
    console.log('✅ records: 8 docs inserted');

    console.log('\n🎉 Seed complete! Ready for migration test.');
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
  } finally {
    await client.close();
  }
}

seed();
