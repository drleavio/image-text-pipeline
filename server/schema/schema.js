const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
});

// Use existing model if it exists, else create a new one
const User = mongoose.models.User || mongoose.model("User", userSchema);

module.exports = User;
