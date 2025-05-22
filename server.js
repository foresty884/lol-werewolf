require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const memberSchema = new mongoose.Schema({
  name: String,
  team: String,
  role: String,
  tasks: [String]
});

const settingSchema = new mongoose.Schema({
  aTeam: [String],
  bTeam: [String],
  gmMode: Boolean,
  tasksBig: [String],
  tasksSmall: [String],
  numBigTasks: Number,
  numSmallTasks: Number,
  numWolves: Number,
  numVillagers: Number
});

const Member = mongoose.model('Member', memberSchema);
const Setting = mongoose.model('Setting', settingSchema);

// ページルーティング
app.get('/', (_, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/settings', (_, res) => res.sendFile(path.join(__dirname, 'public', 'settings.html')));
app.get('/member/:name', (_, res) => res.sendFile(path.join(__dirname, 'public', 'member.html')));
app.get('/observer', (_, res) => res.sendFile(path.join(__dirname, 'public', 'observer.html')));

// API：設定取得
app.get('/api/settings', async (_, res) => {
  const setting = await Setting.findOne({});
  res.json(setting || {});
});

// API：設定保存
app.post('/api/settings', async (req, res) => {
  await Setting.deleteMany({});
  await Member.deleteMany({});
  const s = req.body;
  await Setting.create(s);

  const members = [...s.aTeam.map(n => ({ name: n, team: 'A' })), ...s.bTeam.map(n => ({ name: n, team: 'B' }))];

  if (s.gmMode) {
    for (const m of members) {
      await Member.create({
        name: m.name,
        team: m.team,
        role: s.roles[m.name] || '村人',
        tasks: s.tasks[m.name] || []
      });
    }
  } else {
    // ランダム割り当て（GM無し）
    const shuffled = members.sort(() => 0.5 - Math.random());
    const wolves = shuffled.slice(0, s.numWolves);
    const villagers = shuffled.slice(s.numWolves);

    const allBigTasks = [...s.tasksBig];
    const allSmallTasks = [...s.tasksSmall];

    const assigned = [...wolves, ...villagers];
    for (const m of assigned) {
      const role = wolves.includes(m) ? '人狼' : '村人';

      const big = allBigTasks.splice(0, s.numBigTasks);
      const small = allSmallTasks.splice(0, s.numSmallTasks);

      await Member.create({
        name: m.name,
        team: m.team,
        role,
        tasks: [...big, ...small]
      });
    }
  }

  res.json({ success: true });
});

// API：メンバー取得
app.get('/api/members', async (_, res) => {
  const members = await Member.find({});
  res.json(members.map(m => m.name));
});

// API：個別メンバー情報
app.get('/api/member/:name', async (req, res) => {
  const member = await Member.findOne({ name: req.params.name });
  res.json(member || {});
});

// API：全員の情報（観戦者用）
app.get('/api/all', async (_, res) => {
  const all = await Member.find({});
  res.json(all);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});