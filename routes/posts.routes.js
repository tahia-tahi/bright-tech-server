const express = require('express');
const { ObjectId } = require('mongodb');
const router = express.Router();
const { verifyClerkToken } = require('../middlewares/verifyClerkToken');

let postCollection;
let commentCollection;
let userCollection;

const setPostCollection = (collection) => {
  postCollection = collection;
};

const setCommentCollection = (collection) => {
  commentCollection = collection;
};

const setUserCollection = (collection) => {
  userCollection = collection
}

// =======================
// User Sync (Create if not exists)
// POST /api/posts/user/sync
// =======================
router.post('/user/sync', verifyClerkToken, async (req, res) => {
  console.log("REQ.USER:", req.user);
  try {
    const existingUser = await userCollection.findOne({
      clerkId: req.user.userId,
    });

    if (existingUser) {
      return res.send({
        success: true,
        user: existingUser,
        message: 'User already exists',
      });
    }

    const newUser = {
      clerkId: req.user.userId,
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      profileImage: req.user.profileImage,
      role: req.user.role || 'user',
      createdAt: new Date(),
    };

    const result = await userCollection.insertOne(newUser);

    res.send({
      success: true,
      userId: result.insertedId,
      message: 'User created successfully',
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      success: false,
      message: 'Failed to sync user',
    });
  }
});


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

// Get logged-in user's posts
router.get('/my-posts', verifyClerkToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const posts = await postCollection
      .find({ 'author.userId': userId })
      .sort({ createdAt: -1 })
      .toArray();

    res.send({
      success: true,
      posts,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      success: false,
      message: 'Failed to fetch user posts',
    });
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
    // if (post.author.email !== req.user.email) 
    if (post.author.userId !== req.user.userId) {
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
    // if (post.author.email !== req.user.email)
    if (post.author.userId !== req.user.userId) {
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
    const userId = req.user.userId;

    const post = await postCollection.findOne({ _id: new ObjectId(postId) });
    if (!post) {
      return res.status(404).send({ success: false, message: 'Post not found' });
    }

    const hasLiked = post.likes.includes(userId);

    let updatedLikeCount;

    if (hasLiked) {
      updatedLikeCount = Math.max(0, post.likeCount - 1);
      await postCollection.updateOne(
        { _id: new ObjectId(postId) },
        {
          $pull: { likes: userId },
          $set: { likeCount: updatedLikeCount }
        }
      );
    } else {
      updatedLikeCount = post.likeCount + 1;
      await postCollection.updateOne(
        { _id: new ObjectId(postId) },
        {
          $addToSet: { likes: userId },
          $set: { likeCount: updatedLikeCount }
        }
      );
    }

    res.send({
      success: true,
      liked: !hasLiked,
      likeCount: updatedLikeCount
    });
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
      user: {
        userId: req.user.userId,
        email: req.user.email,
        name: req.user.name,
      },
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
router.get('/:id', verifyClerkToken, async (req, res) => {
  try {
    const id = req.params.id;

    const post = await postCollection.findOne({ _id: new ObjectId(id) });
    if (!post) {
      return res.status(404).send({ success: false, message: 'Post not found' });
    }

    const liked = post.likes.includes(req.user.userId);

    res.send({
      success: true,
      post: {
        ...post,
        liked
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ success: false, message: 'Failed to fetch post' });
  }
});




module.exports = { router, setPostCollection, setCommentCollection, setUserCollection };
