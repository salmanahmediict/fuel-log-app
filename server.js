require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || 'fuel_log';
const COLLECTION = process.env.MONGODB_COLLECTION || 'entries';

if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI. Copy .env.example to .env and fill in your MongoDB Atlas connection string.');
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let client;
let entriesCollection;

async function connectDB() {
  client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(DB_NAME);
  entriesCollection = db.collection(COLLECTION);
  await entriesCollection.createIndex({ date: 1 });
  await entriesCollection.createIndex({ vehicle: 1 });
  console.log('Connected to MongoDB:', DB_NAME);
}

function serialize(doc) {
  return {
    id: doc._id.toString(),
    vehicle: doc.vehicle,
    date: doc.date,
    odometer: doc.odometer ?? null,
    liters: doc.liters,
    cost: doc.cost,
    notes: doc.notes || ''
  };
}

// GET all entries
app.get('/api/entries', async (req, res) => {
  try {
    const docs = await entriesCollection.find({}).sort({ date: 1 }).toArray();
    res.json(docs.map(serialize));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load entries' });
  }
});

// POST a new entry
app.post('/api/entries', async (req, res) => {
  try {
    const { vehicle, date, odometer, liters, cost, notes } = req.body;

    if (!vehicle || !date || liters == null || cost == null) {
      return res.status(400).json({ error: 'vehicle, date, liters, and cost are required' });
    }

    const doc = {
      vehicle: String(vehicle).trim(),
      date: String(date),
      odometer: odometer === '' || odometer == null ? null : Number(odometer),
      liters: Number(liters),
      cost: Number(cost),
      notes: notes ? String(notes).trim() : '',
      createdAt: new Date()
    };

    const result = await entriesCollection.insertOne(doc);
    res.status(201).json(serialize({ ...doc, _id: result.insertedId }));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save entry' });
  }
});

// DELETE an entry
app.delete('/api/entries/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid entry id' });
    }
    const result = await entriesCollection.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    res.json({ deleted: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

connectDB()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => console.log(`Fuel log server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });
