const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// MongoDB接続
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// スキーマとモデル定義
const memberSchema = new mongoose.Schema({
  name: String,
  role: String,
  tasks: [String],
  team: String,
});
const Member = mongoose.model('Member', memberSchema);

// APIエンドポイント
app.get('/api/members', async (req, res) => {
  try {
    const members = await Member.find();
    res.json(members);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

app.post('/api/members', async (req, res) => {
  try {
    const newMember = new Member(req.body);
    await newMember.save();
    res.status(201).json(newMember);
  } catch (err) {
    res.status(400).json({ error: 'Failed to create member' });
  }
});

app.delete('/api/members', async (req, res) => {
  try {
    await Member.deleteMany();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset members' });
  }
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/settings', (req, res) => res.sendFile(path.join(__dirname, 'public', 'settings.html')));
app.get('/member/:id', (req, res) => res.sendFile(path.join(__dirname, 'public', 'member.html')));
app.get('/observer', (req, res) => res.sendFile(path.join(__dirname, 'public', 'observer.html')));

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
