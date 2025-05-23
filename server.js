const express = require("express");
const bodyParser = require("body-parser");
const { MongoClient } = require("mongodb");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB 設定
const uri = process.env.MONGO_URI;
const dbName = "lolTaskAssigner";

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

// 設定保存
app.post("/api/save-settings", async (req, res) => {
  const settingsData = req.body;

  if (!settingsData) {
    return res.status(400).json({ success: false, error: "Invalid settings data" });
  }

  try {
    const result = await settingsCollection.insertOne(settingsData);
    res.status(200).json({
      success: true,
      message: "Settings saved successfully",
      data: { id: result.insertedId }, 
    });
  } catch (error) {
    console.error("Error saving settings:", error);
    res.status(500).json({ success: false, error: "Failed to save settings" });
  }
});

// 設定リセット
app.delete("/api/reset-settings", async (req, res) => {
  try {
    const result = await settingsCollection.deleteMany({});
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