const express = require('express');
const { ObjectId } = require('mongodb');
const router = express.Router();
const { verifyClerkToken } = require('../middlewares/verifyClerkToken');

let postCollection;
let commentCollection;

const setPostCollection = (collection) => {
  postCollection = collection;
};

const setCommentCollection = (collection) => {
  commentCollection = collection;
};

// Create Post
router.post('/', verifyClerkToken, async (req, res) => {
  // console.log('Headers:', req.headers);
  // console.log('Token:', req.headers.authorization);

  try {
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).send({
        success: false,
        message: "Title and content are required",
      });
    }

    const newPost = {
      title,
      content,
      image: req.body.image || '',
      author: { userId: req.user.userId, email: req.user.email },
      createdAt: new Date(),
      likeCount: 0,
      commentCount: 0,
      likes: []
    };

    const result = await postCollection.insertOne(newPost);
    res.send({ success: true, postId: result.insertedId });
  } catch (error) {
    console.error(error);
    res.status(500).send({ success: false, message: 'Failed to create post' });
  }
});

// Get all posts
router.get('/', async (req, res) => {
  try {
    const posts = await postCollection.find().sort({ createdAt: -1 }).toArray();
    res.send(posts);
  } catch (error) {
    console.error(error);
    res.status(500).send({ success: false, message: 'Failed to fetch posts' });
  }
});

// Edit a post
router.put('/:postId', verifyClerkToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).send({
        success: false,
        message: "Title and content are required",
      });
    }

    // Find the post
    const post = await postCollection.findOne({ _id: new ObjectId(postId) });
    if (!post) {
      return res.status(404).send({ success: false, message: "Post not found" });
    }

    // Check if the logged-in user is the author
    if (post.author.email !== req.user.email) {
      return res.status(403).send({ success: false, message: "You cannot edit this post" });
    }

    // Update post
    await postCollection.updateOne(
      { _id: new ObjectId(postId) },
      { $set: { title, content, updatedAt: new Date() } }
    );

    res.send({ success: true, message: "Post updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).send({ success: false, message: "Failed to update post" });
  }
});

// Delete post
router.delete('/:postId', verifyClerkToken, async (req, res) => {
  try {
    const postId = req.params.postId;

    if (!ObjectId.isValid(postId)) {
      return res.status(400).send({ success: false, message: "Invalid post ID" });
    }

    const post = await postCollection.findOne({ _id: new ObjectId(postId) });
    if (!post) return res.status(404).send({ success: false, message: "Post not found" });

    // Only author can delete
    if (post.author.email !== req.user.email) {
      return res.status(403).send({ success: false, message: "Forbidden: You cannot delete this post" });
    }

    await postCollection.deleteOne({ _id: new ObjectId(postId) });

    // Optional: delete all comments associated with the post
    await commentCollection.deleteMany({ postId: new ObjectId(postId) });

    res.send({ success: true, message: "Post deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).send({ success: false, message: "Failed to delete post" });
  }
});


// Like/Unlike a post
router.patch('/like/:postId', verifyClerkToken, async (req, res) => {
  try {
    const postId = req.params.postId;
    const userEmail = req.user.email;

    const post = await postCollection.findOne({ _id: new ObjectId(postId) });
    if (!post) return res.status(404).send({ success: false, message: 'Post not found' });

    const hasLiked = post.likes.includes(userEmail);
    const update = hasLiked
      ? { $pull: { likes: userEmail }, $inc: { likeCount: -1 } }
      : { $addToSet: { likes: userEmail }, $inc: { likeCount: 1 } };

    await postCollection.updateOne({ _id: new ObjectId(postId) }, update);
    res.send({ success: true, liked: !hasLiked });
  } catch (error) {
    console.error(error);
    res.status(500).send({ success: false, message: 'Failed to update like' });
  }
});

// Add comment
router.post('/comment/:postId', verifyClerkToken, async (req, res) => {
  try {
    const postId = req.params.postId;
    const { text } = req.body;

    if (!text) return res.status(400).send({ success: false, message: 'Comment text is required' });

    const newComment = {
      postId: new ObjectId(postId),
      user: { userId: req.user.userId, email: req.user.email },
      text,
      createdAt: new Date(),
    };

    const result = await commentCollection.insertOne(newComment);

    await postCollection.updateOne(
      { _id: new ObjectId(postId) },
      { $inc: { commentCount: 1 } }
    );

    res.send({ success: true, commentId: result.insertedId });
  } catch (error) {
    console.error(error);
    res.status(500).send({ success: false, message: 'Failed to add comment' });
  }
});

// Get comments
router.get('/comments/:postId', async (req, res) => {
  try {
    const postId = req.params.postId;
    const comments = await commentCollection
      .find({ postId: new ObjectId(postId) })
      .sort({ createdAt: -1 })
      .toArray();

    res.send({ success: true, comments });
  } catch (error) {
    console.error(error);
    res.status(500).send({ success: false, message: 'Failed to fetch comments' });
  }
});

// Get single post by ID (KEEP THIS LAST)
router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id;

    const post = await postCollection.findOne({
      _id: new ObjectId(id)
    });

    if (!post) {
      return res.status(404).send({
        success: false,
        message: 'Post not found'
      });
    }

    res.send({
      success: true,
      post
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      success: false,
      message: 'Failed to fetch post'
    });
  }
});




module.exports = { router, setPostCollection, setCommentCollection };
