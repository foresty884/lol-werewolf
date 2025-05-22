require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB接続
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const playerSchema = new mongoose.Schema({
  name: String,
  team: String,
  role: String,
  largeTasks: [String],
  smallTasks: [String]
});

const Player = mongoose.model("Player", playerSchema);

app.use(bodyParser.json());
app.use(express.static("public"));

// API: 設定保存
app.post("/api/setup", async (req, res) => {
  const { aTeam, bTeam, largeTasks, smallTasks, largeCount, smallCount, villagerCount, werewolfCount } = req.body;

  await Player.deleteMany({});
  const allPlayers = [...aTeam.map(n => ({ name: n, team: "A" })), ...bTeam.map(n => ({ name: n, team: "B" }))];

  // 役職ランダム割当
  const roles = Array(villagerCount).fill("村人").concat(Array(werewolfCount).fill("人狼"));
  roles.sort(() => Math.random() - 0.5);

  // タスクシャッフル
  const shuffledLarge = [...largeTasks].sort(() => Math.random() - 0.5);
  const shuffledSmall = [...smallTasks].sort(() => Math.random() - 0.5);

  const playerDocs = allPlayers.map((p, i) => {
    const startL = i * largeCount;
    const startS = i * smallCount;
    return {
      name: p.name,
      team: p.team,
      role: roles[i],
      largeTasks: shuffledLarge.slice(startL, startL + largeCount),
      smallTasks: shuffledSmall.slice(startS, startS + smallCount)
    };
  });

  await Player.insertMany(playerDocs);
  res.status(200).json({ ok: true });
});

// API: 名前一覧取得
app.get("/api/players", async (req, res) => {
  const players = await Player.find({});
  res.json({ players });
});

// API: 個別情報取得
app.get("/api/player/:name", async (req, res) => {
  const player = await Player.findOne({ name: req.params.name });
  if (!player) return res.status(404).json({ error: "not found" });
  res.json(player);
});

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));