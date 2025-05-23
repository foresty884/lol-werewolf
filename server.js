// server.js

const express = require("express");
const bodyParser = require("body-parser");
const { MongoClient } = require("mongodb");

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB 設定
const uri = process.env.MONGO_URI;
const dbName = "lolTaskAssigner";

let db, membersCollection, tasksCollection;

MongoClient.connect(uri, { useUnifiedTopology: true })
  .then(client => {
    db = client.db(dbName);
    membersCollection = db.collection("members");
    tasksCollection = db.collection("tasks");
    console.log("Connected to database");
  })
  .catch(console.error);

app.use(bodyParser.json());
app.use(express.static("public"));

app.get('/settings', (req, res) => res.sendFile(path.join(__dirname, 'public', 'settings.html')));
// メンバー操作
app.get("/api/members", async (req, res) => {
  const members = await membersCollection.find().toArray();
  res.json(members);
});

app.post("/api/members", async (req, res) => {
  const newMember = req.body;
  const result = await membersCollection.insertOne(newMember);
  res.json(result.ops[0]);
});

app.post("/api/save-settings", (req, res) => {
  const settingsData = req.body;

  // データ検証
  if (!settingsData) {
    return res.status(400).json({ error: "Invalid settings data" });
  }

  // MongoDBに保存
  SettingsModel.create(settingsData)
    .then((result) => {
      res.status(200).json({ message: "Settings saved successfully", data: result });
    })
    .catch((err) => {
      console.error("Error saving settings:", err);
      res.status(500).json({ error: "Failed to save settings" });
    });
});

app.delete("/api/members/:index", async (req, res) => {
  const index = parseInt(req.params.index, 10);
  const members = await membersCollection.find().toArray();
  const memberToRemove = members[index];

  if (memberToRemove) {
    await membersCollection.deleteOne({ _id: memberToRemove._id });
    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

// タスク割り当て
app.post("/api/assign-tasks", async (req, res) => {
  const { majorCount, minorCount } = req.body;
  const members = await membersCollection.find().toArray();
  const tasks = await tasksCollection.find().toArray();

  const majorTasks = tasks.filter(task => task.type === "major").map(t => t.name);
  const minorTasks = tasks.filter(task => task.type === "minor").map(t => t.name);

  if (majorTasks.length < majorCount * members.length || minorTasks.length < minorCount * members.length) {
    return res.status(400).send("Not enough tasks to assign.");
  }

  const shuffledMajor = majorTasks.sort(() => Math.random() - 0.5);
  const shuffledMinor = minorTasks.sort(() => Math.random() - 0.5);

  const assignments = members.map(member => {
    const assignedMajor = shuffledMajor.splice(0, majorCount);
    const assignedMinor = shuffledMinor.splice(0, minorCount);
    return { name: member.name, tasks: { major: assignedMajor, minor: assignedMinor } };
  });

  res.json(assignments);
});

app.get("/tasks", async (req, res) => {
  try {
    const tasks = await Task.find();
    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});


// サーバー起動
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
