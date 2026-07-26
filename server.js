require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || 'fuel_log';
const COLLECTION = process.env.MONGODB_COLLECTION || 'entries';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Cache connection across serverless invocations
let cachedClient = null;

async function getCollection() {
  if (!cachedClient) {
    cachedClient = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      tls: true,
    });
    await cachedClient.connect();
  }
  return cachedClient.db(DB_NAME).collection(COLLECTION);
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

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.get('/api/entries', async (req, res) => {
  try {
    const col = await getCollection();
    const docs = await col.find({}).sort({ date: 1 }).toArray();
    res.json(docs.map(serialize));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

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
    const col = await getCollection();
    const result = await col.insertOne(doc);
    res.status(201).json(serialize({ ...doc, _id: result.insertedId }));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/entries/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid id' });
    const col = await getCollection();
    const result = await col.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// For local use
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, '0.0.0.0', () => console.log(`Running on port ${PORT}`));
}

module.exports = app;