const { verifyToken, clerkClient } = require("@clerk/clerk-sdk-node");

const verifyClerkToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "Unauthorized" });

    const token = authHeader.split(" ")[1];
    const decoded = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    const user = await clerkClient.users.getUser(decoded.sub);

    req.user = {
      userId: user.id,
      email: user.emailAddresses[0]?.emailAddress,
      name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      profileImage: user.profileImageUrl || "", 
      role: user.publicMetadata?.role || "user",
    };

    next();
  } catch (err) {
    console.error(err);
    res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = { verifyClerkToken };
