const express = require("express")
const cors = require("cors")
require("dotenv").config()

const { registerUser, loginUser, authenticateToken, checkAdminStatus } = require("./src/auth")
const {
  getProducts,
  getProductById,
  getCategories,
  addProduct,
  updateProduct,
  deleteProduct,
  getAllProductsAdmin,
  decrementProductStock,
} = require("./src/products")

const {
  getCartItems,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
} = require("./src/cart")

const {
  initializePayment,
  handlePaymentCallback,
  verifyPayment
} = require("./src/payment")

const app = express()

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, Postman)
      if (!origin) return callback(null, true)

      // Allow all localhost and 127.0.0.1 origins on any port
      if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
        return callback(null, true)
      }

      // Allow file:// protocol (when opening HTML files directly)
      if (origin === "null") {
        return callback(null, true)
      }

      // Allow any origin for development (remove in production)
      return callback(null, true)
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
)

// Middleware
app.use(express.json())

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
  console.log("Origin:", req.headers.origin)
  console.log("User-Agent:", req.headers["user-agent"])
  console.log("Content-Type:", req.headers["content-type"])
  if (req.body && Object.keys(req.body).length > 0) {
    console.log("Request body keys:", Object.keys(req.body))
  }
  next()
})

// Test route
app.get("/", (req, res) => {
  res.json({
    message: "Universal Market Backend is running 🚀",
    timestamp: new Date().toISOString(),
    cors: "enabled",
  })
})

app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    database: "connected", // You can add actual DB health check here
  })
})

// Authentication routes
app.post("/api/auth/register", registerUser)
app.post("/api/auth/login", loginUser)
app.get("/api/auth/check-admin", authenticateToken, checkAdminStatus)

// Products routes
app.get("/api/products", getProducts)
app.get("/api/products/:id", getProductById)
app.get("/api/categories", getCategories)
app.post("/api/products", addProduct) // Removed auth requirement for admin
app.put("/api/products/:id", updateProduct) // Removed auth requirement for admin
app.delete("/api/products/:id", deleteProduct) // Removed auth requirement for admin
app.get("/api/admin/products", authenticateToken, getAllProductsAdmin)
// Cart routes (all require authentication)
app.get("/api/cart", authenticateToken, getCartItems)
app.post("/api/cart", authenticateToken, addToCart)
app.put("/api/cart/:cart_item_id", authenticateToken, updateCartItem)
app.delete("/api/cart/:cart_item_id", authenticateToken, removeFromCart)
app.delete("/api/cart", authenticateToken, clearCart)
// Payment routes
app.post("/api/payment/initialize", authenticateToken, initializePayment)
app.post("/api/payment/callback", handlePaymentCallback)
app.get("/api/payment/verify/:tx_ref", authenticateToken, verifyPayment)

// Decrement product stock
app.post("/api/products/:id/decrement-stock", authenticateToken, decrementProductStock);

// Protected route example
app.get("/api/auth/profile", authenticateToken, (req, res) => {
  res.json({
    message: "Protected route accessed successfully",
    user: req.user,
  })
})

// Test protected route
app.get("/api/protected", authenticateToken, (req, res) => {
  res.json({ message: "This is a protected route", userId: req.user.userId })
})

app.use((err, req, res, next) => {
  console.error("Server error details:")
  console.error("- Error name:", err.name)
  console.error("- Error message:", err.message)
  console.error("- Error stack:", err.stack)
  console.error("- Request path:", req.path)
  console.error("- Request method:", req.method)
  console.error("- Request headers:", req.headers)

  res.status(500).json({
    error: "Internal server error",
    message: process.env.NODE_ENV === "development" ? err.message : "Something went wrong",
    timestamp: new Date().toISOString(),
    path: req.path,
  })
})

// Handle 404 for all unmatched routes
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.path,
    method: req.method,
  })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`)
  console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth/`)
  console.log(`🛍️ Products endpoints: http://localhost:${PORT}/api/products`)
})
