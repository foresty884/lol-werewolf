const express = require('express');
const { MongoClient } = require('mongodb');
const app = express();
const PORT = 10000;

// 環境変数からMongoDBの接続URLを取得（存在しない場合はデフォルト値を使用）
const mongoUrl = process.env.MONGO_URI || 'mongodb+srv://<username>:<password>@cluster0.mongodb.net/lol-werewolf?retryWrites=true&w=majority';

// MongoDBへの接続関数
async function connectToMongoDB() {
    try {
        const client = await MongoClient.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log("Connected to MongoDB");
        return client.db('lol-werewolf');
    } catch (error) {
        console.error("Failed to connect to MongoDB:", error);
        process.exit(1); // エラー時にアプリケーションを停止
    }
}

// MongoDB接続
let db;
let membersCollection;
(async () => {
    db = await connectToMongoDB();
    membersCollection = db.collection('members');
})();

// JSONパーサーを設定
app.use(express.json());

// ルートエンドポイント
app.get('/', (req, res) => {
    res.send('LOL Werewolf Server is running!');
});

// 設定画面のデータ取得エンドポイント
app.get('/members', async (req, res) => {
    try {
        const members = await membersCollection.find().toArray();
        res.json(members);
    } catch (error) {
        console.error("Error fetching members:", error);
        res.status(500).send("Internal Server Error");
    }
});

// 設定データの保存エンドポイント
app.post('/members', async (req, res) => {
    try {
        const newMembers = req.body;
        await membersCollection.deleteMany({});
        await membersCollection.insertMany(newMembers);
        res.status(201).send("Members updated successfully");
    } catch (error) {
        console.error("Error updating members:", error);
        res.status(500).send("Internal Server Error");
    }
});

// サーバー起動
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
