const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { MongoClient, ObjectId } = require('mongodb');
const app = express();
const port = 3000;

// MongoDB Setup
const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);
const dbName = 'lol_werewolf';
let db;

app.use(bodyParser.json());

client.connect().then(() => {
  db = client.db(dbName);
  console.log(`Connected to database: ${dbName}`);
}).catch(err => {
  console.error('Database connection failed:', err);
});

// Routes
// Get all members
app.get('/api/members', async (req, res) => {
  try {
    const members = await db.collection('members').find().toArray();
    res.json({ success: true, members });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Save members
app.post('/api/members', async (req, res) => {
  try {
    const { members } = req.body;
    await db.collection('members').deleteMany({});
    await db.collection('members').insertMany(members);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get settings
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await db.collection('settings').findOne();
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Save settings
app.post('/api/settings', async (req, res) => {
  try {
    const settings = req.body;
    await db.collection('settings').deleteMany({});
    await db.collection('settings').insertOne(settings);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get tasks
app.get('/api/tasks', async (req, res) => {
  try {
    const tasks = await db.collection('tasks').find().toArray();
    res.json({ success: true, tasks });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 静的ファイルの配信
app.use(express.static(path.join(__dirname, 'public')));

// ルートのリダイレクト（デフォルトで index.html を返す）
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// サーバー起動
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});