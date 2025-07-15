const express = require("express");
const User = require("../schema/schema");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const dbConnect=require("../dbConnect/dbConnect")

const router = express.Router();

router.post("/signup", async (req, res) => {
   const {email,password}=req.body;

   if (!email || !password) {
    return res.status(400).json({ msg: "Email and password are required" });
  }

  try {
    const userExist = await User.findOne({ email });

    if (userExist) {
      return res.status(404).json({ msg: "User already exist please login" });
    }
    const hashedPassword=await bcrypt.hash(password,10);
    const user=new User({
        email,
        password:hashedPassword
    })
    await user.save();
    return res.status(201).json({ msg: "User registered successfully!" });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({ msg: "Internal server error" });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ msg: "Email and password are required" });
  }

  try {
    await dbConnect();
    const userExist = await User.findOne({ email });

    if (!userExist) {
      return res.status(404).json({ msg: "User does not exist" });
    }

    const matchPassword = await bcrypt.compare(password, userExist.password);

    if (!matchPassword) {
      return res.status(401).json({ msg: "Password is incorrect" });
    }

    const payload = {
      email: userExist.email,
      id: userExist._id,
    };

    const token = jwt.sign(payload, "your_secret_key", { expiresIn: "1h" });

    return res.status(200).json({
      msg: "Login successful",
      token,
      user: {
        email: userExist.email,
        id: userExist._id,
      },
    });

  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ msg: "Internal server error" });
  }
});

module.exports = router;
