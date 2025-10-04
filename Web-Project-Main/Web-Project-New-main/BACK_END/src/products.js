const pool = require("./database")

// Get all products with optional filtering
const getProducts = async (req, res) => {
  try {
    const { categories, minPrice, maxPrice, search } = req.query

    let query = "SELECT * FROM products WHERE is_active = true"
    const queryParams = []
    let paramCount = 0

    // Filter by categories
    if (categories && categories.length > 0) {
      const categoryArray = Array.isArray(categories) ? categories : categories.split(",")
      const categoryPlaceholders = categoryArray.map(() => `$${++paramCount}`).join(",")
      query += ` AND category IN (${categoryPlaceholders})`
      queryParams.push(...categoryArray)
    }

    // Filter by price range
    if (minPrice) {
      query += ` AND price >= $${++paramCount}`
      queryParams.push(Number.parseFloat(minPrice))
    }
    if (maxPrice) {
      query += ` AND price <= $${++paramCount}`
      queryParams.push(Number.parseFloat(maxPrice))
    }

    // Search by name or description
    if (search) {
      query += ` AND (name ILIKE $${++paramCount} OR description ILIKE $${++paramCount})`
      queryParams.push(`%${search}%`, `%${search}%`)
    }

    query += " ORDER BY created_at DESC"

    console.log("[PRODUCTS] Executing query:", query)
    console.log("[PRODUCTS] Query params:", queryParams)

    const result = await pool.query(query, queryParams)

    res.json({
      success: true,
      products: result.rows,
      count: result.rows.length,
    })
  } catch (error) {
    console.error("[PRODUCTS] Error fetching products:", error)
    res.status(500).json({
      success: false,
      error: "Failed to fetch products",
      message: error.message,
    })
  }
}

// Get single product by ID
const getProductById = async (req, res) => {
  try {
    const { id } = req.params

    const result = await pool.query("SELECT * FROM products WHERE id = $1 AND is_active = true", [id])

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Product not found",
      })
    }

    res.json({
      success: true,
      product: result.rows[0],
    })
  } catch (error) {
    console.error("[PRODUCTS] Error fetching product:", error)
    res.status(500).json({
      success: false,
      error: "Failed to fetch product",
      message: error.message,
    })
  }
}

// Get all unique categories
const getCategories = async (req, res) => {
  try {
    const result = await pool.query("SELECT DISTINCT category FROM products WHERE is_active = true ORDER BY category")

    res.json({
      success: true,
      categories: result.rows.map((row) => row.category),
    })
  } catch (error) {
    console.error("[PRODUCTS] Error fetching categories:", error)
    res.status(500).json({
      success: false,
      error: "Failed to fetch categories",
      message: error.message,
    })
  }
}

const addProduct = async (req, res) => {
  try {
    const { name, description, price, category, image_url, stock_quantity } = req.body
    const seller_id = req.user ? req.user.userId : 1 // Default to user 1 if no auth

    // Validate required fields
    if (!name || !price || !category) {
      return res.status(400).json({
        success: false,
        error: "Name, price, and category are required",
      })
    }

    const result = await pool.query(
      "INSERT INTO products (seller_id, name, description, price, category, image_url, stock_quantity) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
      [seller_id, name, description, Number.parseFloat(price), category, image_url, stock_quantity || 1],
    )

    res.status(201).json({
      success: true,
      product: result.rows[0],
      message: "Product added successfully",
    })
  } catch (error) {
    console.error("[PRODUCTS] Error adding product:", error)
    res.status(500).json({
      success: false,
      error: "Failed to add product",
      message: error.message,
    })
  }
}

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params
    const { name, description, price, category, image_url, stock_quantity, is_active } = req.body

    // Validate required fields
    if (!name || !price || !category) {
      return res.status(400).json({
        success: false,
        error: "Name, price, and category are required",
      })
    }

    const result = await pool.query(
      "UPDATE products SET name = $1, description = $2, price = $3, category = $4, image_url = $5, stock_quantity = $6, is_active = $7 WHERE id = $8 RETURNING *",
      [name, description, Number.parseFloat(price), category, image_url, stock_quantity || 0, is_active !== false, id],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Product not found",
      })
    }

    res.json({
      success: true,
      product: result.rows[0],
      message: "Product updated successfully",
    })
  } catch (error) {
    console.error("[PRODUCTS] Error updating product:", error)
    res.status(500).json({
      success: false,
      error: "Failed to update product",
      message: error.message,
    })
  }
}

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params

    // Soft delete by setting is_active to false
    const result = await pool.query("UPDATE products SET is_active = false WHERE id = $1 RETURNING *", [id])

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Product not found",
      })
    }

    res.json({
      success: true,
      message: "Product deleted successfully",
    })
  } catch (error) {
    console.error("[PRODUCTS] Error deleting product:", error)
    res.status(500).json({
      success: false,
      error: "Failed to delete product",
      message: error.message,
    })
  }
}

const getAllProductsAdmin = async (req, res) => {
  try {
    const { search, category } = req.query

    let query = "SELECT * FROM products"
    const queryParams = []
    let paramCount = 0
    const conditions = []

    // Search by name or description
    if (search) {
      conditions.push(`(name ILIKE $${++paramCount} OR description ILIKE $${paramCount})`)
      queryParams.push(`%${search}%`)
    }

    // Filter by category
    if (category) {
      conditions.push(`category = $${++paramCount}`)
      queryParams.push(category)
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`
    }

    query += " ORDER BY created_at DESC"

    console.log("[PRODUCTS] Admin query:", query)
    console.log("[PRODUCTS] Query params:", queryParams)

    const result = await pool.query(query, queryParams)

    res.json({
      success: true,
      products: result.rows,
      count: result.rows.length,
    })
  } catch (error) {
    console.error("[PRODUCTS] Error fetching admin products:", error)
    res.status(500).json({
      success: false,
      error: "Failed to fetch products",
      message: error.message,
    })
  }
}

// Decrement product stock
async function decrementProductStock(req, res) {
  try {
    const productId = req.params.id;
    const { quantity } = req.body;

    const query = `
      UPDATE products 
      SET stock_quantity = stock_quantity - $1
      WHERE id = $2
      RETURNING *`;

    const result = await pool.query(query, [quantity, productId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    console.log(`[PRODUCT] Stock updated for product ${productId}: ${result.rows[0].stock_quantity} remaining`);
    res.json({ success: true, product: result.rows[0] });

  } catch (error) {
    console.error("[PRODUCT] Error decrementing stock:", error);
    res.status(500).json({ error: "Failed to update product stock" });
  }
}

module.exports = {
  getProducts,
  getProductById,
  getCategories,
  addProduct,
  updateProduct,
  deleteProduct,
  getAllProductsAdmin,
  decrementProductStock,
}
