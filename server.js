// server.js

const express = require("express");
const bodyParser = require("body-parser");
const { MongoClient } = require("mongodb");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB 設定
const uri = process.env.MONGO_URI;
const dbName = "lolTaskAssigner";

let db, membersCollection, tasksCollection, settingsCollection;

MongoClient.connect(uri, { useUnifiedTopology: true })
  .then(client => {
    db = client.db(dbName);
    membersCollection = db.collection("members");
    tasksCollection = db.collection("tasks");
    settingsCollection = db.collection("settings");
    console.log("Connected to database");

    // サーバー起動
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch(error => {
    console.error("Failed to connect to MongoDB:", error);
    process.exit(1); // エラー時にプロセスを終了
  });

app.use(bodyParser.json());
app.use(express.static("public"));

app.get('/settings', (req, res) => res.sendFile(path.join(__dirname, 'public', 'settings.html')));

// メンバー操作
app.get("/api/members", async (req, res) => {
  try {
    const members = await membersCollection.find().toArray();
    res.json(members);
  } catch (error) {
    console.error("Error fetching members:", error);
    res.status(500).json({ error: "Failed to fetch members" });
  }
});

app.post("/api/members", async (req, res) => {
  const newMember = req.body;

  try {
    const result = await membersCollection.insertOne(newMember);
    res.json(result.ops[0]);
  } catch (error) {
    console.error("Error adding member:", error);
    res.status(500).json({ error: "Failed to add member" });
  }
});

app.delete("/api/members/:index", async (req, res) => {
  const index = parseInt(req.params.index, 10);

  try {
    const members = await membersCollection.find().toArray();
    const memberToRemove = members[index];

    if (memberToRemove) {
      await membersCollection.deleteOne({ _id: memberToRemove._id });
      res.sendStatus(200);
    } else {
      res.sendStatus(404);
    }
  } catch (error) {
    console.error("Error deleting member:", error);
    res.status(500).json({ error: "Failed to delete member" });
  }
});

// 設定保存
app.post("/api/save-settings", async (req, res) => {
  const settingsData = req.body;

  if (!settingsData) {
    return res.status(400).json({ error: "Invalid settings data" });
  }

  try {
    const result = await settingsCollection.insertOne(settingsData);
    res.status(200).json({
      success: true,
      message: "Settings saved successfully",
      data: result.ops[0], // 保存されたデータ
    });
  } catch (error) {
    console.error("Error saving settings:", error);
    res.status(500).json({
      success: false,
      error: "Failed to save settings",
    });
  }
});

// 設定リセット
app.delete("/api/reset-settings", async (req, res) => {
  try {
    const result = await settingsCollection.deleteMany({});
    res.status(200).json({
      success: true,
      message: "All settings have been reset.",
      deletedCount: result.deletedCount, // 削除されたドキュメント数
    });
  } catch (error) {
    console.error("Error resetting settings:", error);
    res.status(500).json({
      success: false,
      error: "Failed to reset settings.",
    });
  }
});

// タスク割り当て
app.post("/api/assign-tasks", async (req, res) => {
  const { majorCount, minorCount } = req.body;

  if (!majorCount || !minorCount) {
    return res.status(400).json({ error: "Both majorCount and minorCount are required." });
  }

  try {
    const members = await membersCollection.find().toArray();
    const tasks = await tasksCollection.find().toArray();

    const majorTasks = tasks.filter(task => task.type === "major").map(t => t.name);
    const minorTasks = tasks.filter(task => task.type === "minor").map(t => t.name);

    if (majorTasks.length < majorCount * members.length || minorTasks.length < minorCount * members.length) {
      return res.status(400).json({ error: "Not enough tasks to assign." });
    }

    const shuffledMajor = majorTasks.sort(() => Math.random() - 0.5);
    const shuffledMinor = minorTasks.sort(() => Math.random() - 0.5);

    const assignments = members.map(member => {
      const assignedMajor = shuffledMajor.splice(0, majorCount);
      const assignedMinor = shuffledMinor.splice(0, minorCount);
      return { name: member.name, tasks: { major: assignedMajor, minor: assignedMinor } };
    });

    res.json(assignments);
  } catch (error) {
    console.error("Error assigning tasks:", error);
    res.status(500).json({ error: "Failed to assign tasks." });
  }
});

// タスク取得
app.get("/tasks", async (req, res) => {
  try {
    const tasks = await tasksCollection.find().toArray();
    res.json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});
