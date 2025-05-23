const express = require("express");
const bodyParser = require("body-parser");
const { MongoClient } = require("mongodb");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB 設定
const uri = process.env.MONGO_URI;
const dbName = "test";

let db, settingsCollection, membersCollection, tasksCollection;

MongoClient.connect(uri, { useUnifiedTopology: true })
  .then(client => {
    db = client.db(dbName);
    settingsCollection = db.collection("settings");
    membersCollection = db.collection("members");
    tasksCollection = db.collection("tasks");
    console.log("Connected to database");
  })
  .catch(console.error);

app.use(bodyParser.json());
app.use(express.static("public"));

app.get('/settings', (req, res) => res.sendFile(path.join(__dirname, 'public', 'settings.html')));
app.get("/api/check-db", async (req, res) => {
  try {
    const collections = await db.listCollections().toArray();
    res.status(200).json({ success: true, collections });
  } catch (error) {
    console.error("Error checking DB:", error);
    res.status(500).json({ success: false, error: "Failed to check DB" });
  }
});
app.get("/api/members", async (req, res) => {
  try {
    const members = await membersCollection.find().toArray();
    res.status(200).json({ success: true, members });
  } catch (error) {
    console.error("Error fetching members:", error);
    res.status(500).json({ success: false, error: "Failed to fetch members" });
  }
});

// 設定保存
app.post("/api/save-settings", async (req, res) => {
  const { settings, members, tasks } = req.body;

  try {
    // 設定の保存
    await settingsCollection.replaceOne({}, settings, { upsert: true });

    // メンバーの保存
    await membersCollection.deleteMany({});
    await membersCollection.insertMany(members);

    // タスクの保存
    await tasksCollection.deleteMany({});
    await tasksCollection.insertMany(tasks);

    res.status(200).json({ success: true, message: "Settings saved successfully" });
  } catch (error) {
    console.error("Error saving settings:", error);
    res.status(500).json({ success: false, error: "Failed to save settings" });
  }
});

app.get("/api/settings", async (req, res) => {
  try {
    const settings = await settingsCollection.findOne({});
    res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error("Error fetching settings:", error);
    res.status(500).json({ success: false, error: "Failed to fetch settings" });
  }
});

// 設定リセット
app.delete("/api/reset-settings", async (req, res) => {
  try {
    const result = await settingsCollection.deleteMany({});
    console.log("Reset operation result:", result);
    res.status(200).json({
      success: true,
      message: "All settings have been reset.",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Error resetting settings:", error);
    res.status(500).json({ success: false, error: "Failed to reset settings" });
  }
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});