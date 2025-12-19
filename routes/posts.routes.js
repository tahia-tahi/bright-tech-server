const express = require('express');
const { ObjectId } = require('mongodb');
const router = express.Router();
const { verifyClerkToken } = require('../middlewares/verifyClerkToken');
const multer = require('multer');


let postCollection;
let commentCollection;
let userCollection;
const storage = multer.memoryStorage();
const upload = multer({ storage });

const setPostCollection = (collection) => {
  postCollection = collection;
};

const setCommentCollection = (collection) => {
  commentCollection = collection;
};

const setUserCollection = (collection) => {
  userCollection = collection
}

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
      name: req.user.name,
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
    const tags = req.body.tags?.map(tag => tag.toLowerCase()) || [];

    const newPost = {
      title,
      content,
      tags,
      image: req.body.image || '',
      author: { userId: req.user.userId, email: req.user.email, name: req.user.name, image: req.user.profileImage },
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
router.get("/", async (req, res) => {
  try {
    const { search, sort, tag, page, limit } = req.query;

    let query = {};
    let sortOption = { createdAt: -1 };

    // search
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
      ];
    }

    // tag filter
    if (tag) {
      query.tags = tag;
    }

    // sort
    if (sort === "popular") {
      sortOption = { likeCount: -1 };
    }

    const pageNumber = Number(page) || 1;
    const limitNumber = Number(limit) || 10;
    const skip = (pageNumber - 1) * limitNumber;

    const posts = await postCollection
      .find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(limitNumber)
      .toArray();

    const total = await postCollection.countDocuments(query);

    res.send({
      success: true,
      total,
      page: pageNumber,
      posts,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      success: false,
      message: "Failed to fetch posts",
    });
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
router.put('/:postId', verifyClerkToken, upload.single('image'), async (req, res) => {
  try {
    const { postId } = req.params;
    const { title, content, tags } = req.body; // tags as comma separated string
    const file = req.file;

    // Validation
    if (!title || !content) {
      return res.status(400).send({ success: false, message: "Title and content are required" });
    }

    // Find the post
    const post = await postCollection.findOne({ _id: new ObjectId(postId) });
    if (!post) return res.status(404).send({ success: false, message: "Post not found" });

    // Only author can edit
    if (post.author.userId !== req.user.userId) {
      return res.status(403).send({ success: false, message: "You cannot edit this post" });
    }

    // Prepare update object
    const updateObj = {
      title,
      content,
      updatedAt: new Date(),
      tags: tags ? tags.split(",").map(t => t.trim()).filter(t => t) : post.tags, // keep existing tags if not updated
      image: post.image // default to existing image
    };

    // Handle new image
    if (file) {
      const path = `uploads/${Date.now()}-${file.originalname}`;
      fs.writeFileSync(path, file.buffer);
      updateObj.image = path;
    }

    // Update post in DB
    await postCollection.updateOne(
      { _id: new ObjectId(postId) },
      { $set: updateObj }
    );

    // Return updated post
    const updatedPost = await postCollection.findOne({ _id: new ObjectId(postId) });

    res.send({ success: true, message: "Post updated successfully", post: updatedPost });

  } catch (err) {
    console.error(err);
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

router.get('/dashboard/overview', verifyClerkToken, async (req, res) => {
  try {
    const totalPosts = await postCollection.countDocuments();
    const posts = await postCollection.find().toArray();
    const totalLikes = posts.reduce((acc, post) => acc + (post.likeCount || 0), 0);

    const totalComments = await commentCollection.countDocuments();

    // Aggregate posts per tag
    const postsPerTag = await postCollection.aggregate([
      { $unwind: "$tags" },
      { $group: { _id: "$tags", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();

    res.send({
      success: true,
      stats: {
        totalPosts,
        totalLikes,
        totalComments,
        postsPerTag
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ success: false, message: 'Failed to fetch dashboard stats' });
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
