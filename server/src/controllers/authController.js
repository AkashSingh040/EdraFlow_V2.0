const jwt = require("jsonwebtoken");
const User = require("../models/User");

/** Generate a signed JWT for the given user id */
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

/** Strip sensitive fields and return a clean user object */
const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
});

// ── POST /api/auth/register ─────────────────────────────────────────────────
const register = async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "Name, email and password are required" });
  }

  // Prevent arbitrary admin self-registration via API
  const assignedRole = role === "admin" ? "student" : role || "student";

  const user = await User.create({ name, email, password, role: assignedRole });
  const token = signToken(user._id);

  res.status(201).json({ token, user: sanitizeUser(user) });
};

// ── POST /api/auth/login ────────────────────────────────────────────────────
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  // Explicitly select password (it's hidden by default)
  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = signToken(user._id);
  res.json({ token, user: sanitizeUser(user) });
};

// ── GET /api/auth/me ────────────────────────────────────────────────────────
const getMe = async (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
};

module.exports = { register, login, getMe };
