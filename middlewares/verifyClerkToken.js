const { verifyToken } = require("@clerk/clerk-sdk-node");

const verifyClerkToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized - No token" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });

    req.user = {
      userId: decoded.sub,
      email: decoded.email,
      role: decoded.publicMetadata?.role || "user",
    };

    next();
  } catch (error) {
    console.error("JWT verification failed:", error);
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = { verifyClerkToken };
