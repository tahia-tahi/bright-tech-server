const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const { router: postsRouter, setPostCollection, setCommentCollection,setUserCollection } = require('./routes/posts.routes');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.dtv13jm.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();
    const db = client.db('brightTechDB');

    const postCollection = db.collection('posts');
    const commentCollection = db.collection('comments');
    const userCollection = db.collection('users')

    // Inject collections into routes
    setPostCollection(postCollection);
    setCommentCollection(commentCollection);
    setUserCollection(userCollection);

    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
  }
}

run().catch(console.dir);

// Use routes
app.use('/api/posts', postsRouter);

app.get('/', (req, res) => {
  res.send('Server running');
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
