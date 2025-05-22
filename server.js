const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const mongoUri = process.env.MONGO_URI;

app.use(bodyParser.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// 設定画面のルート
app.get('/settings', (req, res) => {
  res.sendFile(__dirname + '/public/settings.html');
});

// メンバー用ページのルート
app.get('/member/:id', async (req, res) => {
  const memberId = req.params.id;
  const client = new MongoClient(mongoUri);
  try {
    await client.connect();
    const db = client.db('lol-werewolf');
    const members = db.collection('members');
    const member = await members.findOne({ id: memberId });
    if (member) {
      res.sendFile(__dirname + '/public/member.html');
    } else {
      res.status(404).send('メンバーが見つかりません');
    }
  } finally {
    await client.close();
  }
});

// 観戦者ページのルート
app.get('/observer', (req, res) => {
  res.sendFile(__dirname + '/public/observer.html');
});

// 設定の保存
app.post('/settings', async (req, res) => {
  const { teams, gmMode, tasks, roles } = req.body;
  const client = new MongoClient(mongoUri);
  try {
    await client.connect();
    const db = client.db('lol-werewolf');
    const settings = db.collection('settings');
    await settings.deleteMany({});
    await settings.insertOne({ teams, gmMode, tasks, roles });
    res.status(200).send('設定が保存されました');
  } finally {
    await client.close();
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});