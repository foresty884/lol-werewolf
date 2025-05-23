const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// MongoDB Atlasの接続URIを環境変数から取得
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI is not defined!');
  process.exit(1);
}

// MongoDBに接続
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// ミドルウェア設定
app.use(cors());
app.use(bodyParser.json());

// 静的ファイルを配信するための設定
app.use(express.static(path.join(__dirname, 'public')));

// ルートアクセス時に index.html を返す
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// データモデルの定義
const taskSchema = new mongoose.Schema({
  name: String,
  role: String,
  tasks: [String]
});
const Task = mongoose.model('Task', taskSchema);

// APIエンドポイントの定義

// メンバー情報の取得
app.get('/api/member/:name', async (req, res) => {
  try {
    const member = await Task.findOne({ name: req.params.name });
    if (member) {
      res.json(member);
    } else {
      res.status(404).json({ message: 'Member not found' });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// メンバー情報の保存
app.post('/api/member', async (req, res) => {
  const { name, role, tasks } = req.body;
  const newMember = new Task({ name, role, tasks });
  try {
    await newMember.save();
    res.status(201).json(newMember);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// サーバーの起動
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
