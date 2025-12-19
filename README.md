
# BrightTech Solutions – Backend

The backend API for **BrightTech Solutions**, built with Node.js, Express, and MongoDB.  
It provides secure REST APIs for posts, likes, comments, and user management.

---

## 🌐 Live API
🔗 https://bright-tech-server-production.up.railway.app

---

## 🚀 Tech Stack
- **Node.js**
- **Express.js**
- **MongoDB Atlas**
- **Clerk JWT Authentication**
- **Multer (Image Upload Ready)**
- **CORS & dotenv**

---

## ✨ Core Features
- Secure REST API
- Clerk JWT Authentication
- User Sync with Clerk
- CRUD Operations for Posts
- Like / Unlike System
- Comment System
- Pagination & Sorting
- Search & Tag Filtering
- Role-ready architecture

---

## 📁 Folder Structure
src/
├── routes/
│ └── posts.routes.js
├── middlewares/
│ └── verifyClerkToken.js
├── index.js
└── package.json


---

## ⚙️ Environment Variables
Create a `.env` file in the root directory:
DB_USER=your_mongodb_username
DB_PASSWORD=your_mongodb_password
CLERK_SECRET_KEY=your_clerk_secret_key


🛠️ Installation & Setup
git clone https://github.com/your-username/bright-tech-server.git
cd bright-tech-server
npm install
npm run dev


🔑 Authentication Flow
Clerk issues JWT token on login
Token is verified using middleware
Protected routes require valid Clerk token

----------------------------------------------------------------------------------------------------------------------------------------------------------------
📌 API Endpoints
1.Create Post
POST /api/posts

2.Get All Posts
GET /api/posts?search=&sort=latest&page=1&limit=9

3. Get Single Post
GET /api/posts/:id

4.Like / Unlike Post
PATCH /api/posts/like/:postId

5.Get Logged-in User's Posts
GET /api/posts/my-posts

6.Edit Post
PUT /api/posts/:postId

7.Delete Post
DELETE /api/posts/:postId

8.Add Comment
POST /api/posts/comment/:postId

9.Get Comments
GET /api/posts/comments/:postId

10.Dashboard Overview
GET /api/posts/dashboard/overview
----------------------------------------------------------------------------------------------------------------------------------------------------------------


📊 Database Collections
users
posts
comments
likes

🚀 Deployment
Backend: Railway
Database: MongoDB Atlas
Environment Variables: Railway Config

