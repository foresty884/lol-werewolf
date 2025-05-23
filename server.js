const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB 接続
const mongoURI = process.env.MONGO_URI;
mongoose.connect(mongoURI, {  });
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => console.log('MongoDB connected'));

// スキーマ定義
const memberSchema = new mongoose.Schema({
  name: String,
  role: String,
  tasks: [String],
});
const Member = mongoose.model('Member', memberSchema);

const settingsSchema = new mongoose.Schema({
  mode: String,
  members: Map,
});
const Setting = mongoose.model('Setting', settingsSchema);

// ミドルウェア
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// ルート
app.get('/api/members', async (req, res) => {
  try {
    const members = await Member.find();
    res.json({ success: true, members });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/members', async (req, res) => {
  try {
    const { name, role, tasks } = req.body;
    const member = new Member({ name, role, tasks });
    await member.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/get-settings', async (req, res) => {
  try {
    const settings = await db.collection('settings').findOne({});
    if (settings) {
      res.json(settings); // 保存されている値を返す
    } else {
      res.json({
        teamA: [],
        teamB: [],
        gmMode: false,
        tasks: {
          largeTasks: [],
          smallTasks: []
        }
      }); // 空のデータを返す
    }
  } catch (err) {
    console.error('設定情報の取得に失敗:', err);
    res.status(500).json({ error: '設定情報の取得に失敗しました' });
  }
});

app.delete('/api/members', async (req, res) => {
  try {
    await Member.deleteMany();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/settings', async (req, res) => {
  try {
    const settings = await Setting.findOne();
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const { mode, members } = req.body;
    await Setting.findOneAndUpdate({}, { mode, members }, { upsert: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/reset-settings', async (req, res) => {
  try {
    await Setting.deleteMany();
    await Member.deleteMany();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/save-settings', async (req, res) => {
  try {
    const settings = req.body;

    // タスク割り振りロジック（例）
    if (settings.gmMode === 'no') {
      const { largeTasks, smallTasks, largeTaskCount, smallTaskCount, teamA, teamB } = settings;
      settings.assignedTasks = assignTasks([...teamA, ...teamB], largeTasks, smallTasks, largeTaskCount, smallTaskCount);
    }

    await db.collection('settings').updateOne({}, { $set: settings }, { upsert: true });
    res.send({ success: true });
  } catch (error) {
    res.status(500).send({ error: '設定の保存に失敗しました' });
  }
});

app.post('/api/save-settings', async (req, res) => {
  try {
    const { teamA, teamB, gmMode, tasks } = req.body;

    await db.collection('settings').updateOne(
      {},
      { $set: { teamA, teamB, gmMode, tasks } },
      { upsert: true } // データが存在しない場合は挿入
    );

    res.json({ success: true });
  } catch (err) {
    console.error('設定情報の保存に失敗:', err);
    res.status(500).json({ error: '設定情報の保存に失敗しました' });
  }
});

app.post('/api/reset-settings', async (req, res) => {
  try {
    await db.collection('settings').deleteOne({});
    res.json({ success: true });
  } catch (err) {
    console.error('設定情報のリセットに失敗:', err);
    res.status(500).json({ error: '設定情報のリセットに失敗しました' });
  }
});


// サーバー起動
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
