const jwt = require("jsonwebtoken");
const User = require("./schema/schema");

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Check if Authorization header is present
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ msg: "Authorization token missing or invalid" });
    }

    const token = authHeader.split(" ")[1];

    // Verify token
    const decoded = jwt.verify(token, "your_secret_key"); // replace with process.env.JWT_SECRET in real use

    // Attach user to request (optional but helpful)
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    req.user = user; // pass user info to next middleware/route
    next();

  } catch (error) {
    console.error("Auth Middleware Error:", error);
    return res.status(401).json({ msg: "Unauthorized access" });
  }
};

module.exports = authMiddleware;
