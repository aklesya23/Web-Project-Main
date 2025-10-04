const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const pool = require("./database")

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production"

// Register new user
const registerUser = async (req, res) => {
  try {
    console.log("[AUTH] Registration attempt:", {
      body: { ...req.body, password: "[HIDDEN]" },
      headers: req.headers,
    })

    const { username, email, phone, password } = req.body

    // Validate input
    if (!username || !email || !phone || !password) {
      console.log("[AUTH] Registration failed: Missing fields")
      return res.status(400).json({ error: "All fields are required" })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      console.log("[AUTH] Registration failed: Invalid email format")
      return res.status(400).json({ error: "Please enter a valid email address" })
    }

    if (password.length < 6) {
      console.log("[AUTH] Registration failed: Password too short")
      return res.status(400).json({ error: "Password must be at least 6 characters long" })
    }

    // Check if user already exists
    console.log("[AUTH] Checking if user exists with email:", email)
    const existingUser = await pool.query("SELECT * FROM users WHERE email = $1", [email])

    if (existingUser.rows.length > 0) {
      console.log("[AUTH] Registration failed: User already exists")
      return res.status(400).json({ error: "User already exists with this email" })
    }

    // Hash password
    console.log("[AUTH] Hashing password...")
    const saltRounds = 10
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    // Insert new user
    console.log("[AUTH] Creating new user in database...")
    const newUser = await pool.query(
      "INSERT INTO users (full_name, email, phone, password_hash, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id, full_name, email, phone, created_at",
      [username, email, phone, hashedPassword],
    )

    console.log("[AUTH] User created successfully:", newUser.rows[0].id)

    // Generate JWT token
    const token = jwt.sign({ userId: newUser.rows[0].id, email: newUser.rows[0].email }, JWT_SECRET, {
      expiresIn: "24h",
    })

    res.status(201).json({
      message: "User registered successfully",
      user: newUser.rows[0],
      token,
    })
  } catch (error) {
    console.error("[AUTH] Registration error:", error)

    if (error.code === "ECONNREFUSED") {
      return res.status(500).json({ error: "Database connection failed. Please check your database configuration." })
    }

    if (error.code === "23505") {
      // Unique constraint violation
      return res.status(400).json({ error: "User already exists with this email" })
    }

    res.status(500).json({ error: "Internal server error. Please try again later." })
  }
}

// Login user
const loginUser = async (req, res) => {
  try {
    console.log("[AUTH] Login attempt:", {
      email: req.body.email,
      hasPassword: !!req.body.password,
    })

    const { email, password } = req.body

    if (!email || !password) {
      console.log("[AUTH] Login failed: Missing credentials")
      return res.status(400).json({ error: "Email and password are required" })
    }

    // Find user by email
    console.log("[AUTH] Looking up user by email:", email)
    const user = await pool.query("SELECT * FROM users WHERE email = $1", [email])

    if (user.rows.length === 0) {
      console.log("[AUTH] Login failed: User not found")
      return res.status(401).json({ error: "Invalid email or password" })
    }

    // Check password
    console.log("[AUTH] Verifying password...")
    const validPassword = await bcrypt.compare(password, user.rows[0].password_hash)

    if (!validPassword) {
      console.log("[AUTH] Login failed: Invalid password")
      return res.status(401).json({ error: "Invalid email or password" })
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user.rows[0].id, email: user.rows[0].email }, JWT_SECRET, { expiresIn: "24h" })

    // Return user data (without password)
    const { password_hash, ...userWithoutPassword } = user.rows[0]

    console.log("[AUTH] Login successful for user:", user.rows[0].id)

    res.json({
      message: "Login successful",
      user: userWithoutPassword,
      token,
    })
  } catch (error) {
    console.error("[AUTH] Login error:", error)

    if (error.code === "ECONNREFUSED") {
      return res.status(500).json({ error: "Database connection failed. Please check your database configuration." })
    }

    res.status(500).json({ error: "Internal server error. Please try again later." })
  }
}

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"]
  const token = authHeader && authHeader.split(" ")[1] // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: "Access token required" })
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" })
    }
    req.user = user
    next()
  })
}

// Function to check if user is admin
const checkAdminStatus = async (req, res) => {
  try {
    const userId = req.user.userId

    console.log("[AUTH] Checking admin status for user:", userId)

    const adminCheck = await pool.query("SELECT * FROM admins WHERE user_id = $1", [userId])

    const isAdmin = adminCheck.rows.length > 0

    res.json({
      isAdmin,
      role: isAdmin ? adminCheck.rows[0].role : "user",
    })
  } catch (error) {
    console.error("[AUTH] Error checking admin status:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}

module.exports = {
  registerUser,
  loginUser,
  authenticateToken,
  checkAdminStatus,
}
