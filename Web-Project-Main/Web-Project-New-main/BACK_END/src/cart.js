const pool = require("./database")

// Get user's cart items
async function getCartItems(req, res) {
  try {
    const userId = req.user.userId
    console.log("[CART] Fetching cart items for user:", userId)

    const query = `
      SELECT 
        ci.id as cart_item_id,
        ci.quantity,
        ci.added_at,
        p.id as product_id,
        p.name,
        p.description,
        p.price,
        p.category,
        p.image_url,
        p.stock_quantity
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.user_id = $1 AND p.is_active = true
      ORDER BY ci.added_at DESC
    `

    const result = await pool.query(query, [userId])
    
    console.log("[CART] Found", result.rows.length, "items in cart")

    res.json({
      success: true,
      cart: result.rows,
      totalItems: result.rows.reduce((sum, item) => sum + item.quantity, 0)
    })
  } catch (error) {
    console.error("[CART] Error fetching cart items:", error)
    res.status(500).json({
      error: "Failed to fetch cart items",
      message: error.message
    })
  }
}

// Add item to cart
async function addToCart(req, res) {
  try {
    const userId = req.user.userId
    const { product_id, quantity = 1 } = req.body

    console.log("[CART] Adding to cart:", { userId, product_id, quantity })

    if (!product_id) {
      return res.status(400).json({ error: "Product ID is required" })
    }

    // Check if product exists and is active
    const productCheck = await pool.query(
      "SELECT id, name, stock_quantity FROM products WHERE id = $1 AND is_active = true",
      [product_id]
    )

    if (productCheck.rows.length === 0) {
      return res.status(404).json({ error: "Product not found or inactive" })
    }

    const product = productCheck.rows[0]

    // Check if there's enough stock
    if (product.stock_quantity < quantity) {
      return res.status(400).json({ 
        error: "Insufficient stock",
        available: product.stock_quantity
      })
    }

    // Check if item already exists in cart
    const existingItem = await pool.query(
      "SELECT id, quantity FROM cart_items WHERE user_id = $1 AND product_id = $2",
      [userId, product_id]
    )

    let result
    if (existingItem.rows.length > 0) {
      // Update quantity
      const newQuantity = existingItem.rows[0].quantity + quantity
      
      // Check stock again for new quantity
      if (product.stock_quantity < newQuantity) {
        return res.status(400).json({ 
          error: "Insufficient stock for requested quantity",
          available: product.stock_quantity,
          currentInCart: existingItem.rows[0].quantity
        })
      }

      result = await pool.query(
        "UPDATE cart_items SET quantity = $1 WHERE id = $2 RETURNING *",
        [newQuantity, existingItem.rows[0].id]
      )
      console.log("[CART] Updated cart item quantity to", newQuantity)
    } else {
      // Insert new item
      result = await pool.query(
        "INSERT INTO cart_items (user_id, product_id, quantity) VALUES ($1, $2, $3) RETURNING *",
        [userId, product_id, quantity]
      )
      console.log("[CART] Added new item to cart")
    }

    res.json({
      success: true,
      message: existingItem.rows.length > 0 ? "Cart item updated" : "Item added to cart",
      cartItem: result.rows[0],
      productName: product.name
    })
  } catch (error) {
    console.error("[CART] Error adding to cart:", error)
    res.status(500).json({
      error: "Failed to add item to cart",
      message: error.message
    })
  }
}

// Update cart item quantity
async function updateCartItem(req, res) {
  try {
    const userId = req.user.userId
    const { cart_item_id } = req.params
    const { quantity } = req.body

    console.log("[CART] Updating cart item:", { cart_item_id, quantity })

    if (!quantity || quantity < 1) {
      return res.status(400).json({ error: "Quantity must be at least 1" })
    }

    // Verify cart item belongs to user and get product info
    const cartItem = await pool.query(
      `SELECT ci.*, p.stock_quantity, p.name 
       FROM cart_items ci 
       JOIN products p ON ci.product_id = p.id
       WHERE ci.id = $1 AND ci.user_id = $2`,
      [cart_item_id, userId]
    )

    if (cartItem.rows.length === 0) {
      return res.status(404).json({ error: "Cart item not found" })
    }

    // Check stock
    if (cartItem.rows[0].stock_quantity < quantity) {
      return res.status(400).json({ 
        error: "Insufficient stock",
        available: cartItem.rows[0].stock_quantity
      })
    }

    const result = await pool.query(
      "UPDATE cart_items SET quantity = $1 WHERE id = $2 RETURNING *",
      [quantity, cart_item_id]
    )

    console.log("[CART] Cart item updated successfully")

    res.json({
      success: true,
      message: "Cart item updated",
      cartItem: result.rows[0]
    })
  } catch (error) {
    console.error("[CART] Error updating cart item:", error)
    res.status(500).json({
      error: "Failed to update cart item",
      message: error.message
    })
  }
}

// Remove item from cart
async function removeFromCart(req, res) {
  try {
    const userId = req.user.userId
    const { cart_item_id } = req.params

    console.log("[CART] Removing cart item:", cart_item_id)

    // Verify cart item belongs to user
    const result = await pool.query(
      "DELETE FROM cart_items WHERE id = $1 AND user_id = $2 RETURNING *",
      [cart_item_id, userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Cart item not found" })
    }

    console.log("[CART] Cart item removed successfully")

    res.json({
      success: true,
      message: "Item removed from cart",
      removedItem: result.rows[0]
    })
  } catch (error) {
    console.error("[CART] Error removing cart item:", error)
    res.status(500).json({
      error: "Failed to remove cart item",
      message: error.message
    })
  }
}

// Clear entire cart
async function clearCart(req, res) {
  try {
    const userId = req.user.userId

    console.log("[CART] Clearing cart for user:", userId)

    const result = await pool.query(
      "DELETE FROM cart_items WHERE user_id = $1 RETURNING *",
      [userId]
    )

    console.log("[CART] Cleared", result.rows.length, "items from cart")

    res.json({
      success: true,
      message: "Cart cleared",
      itemsRemoved: result.rows.length
    })
  } catch (error) {
    console.error("[CART] Error clearing cart:", error)
    res.status(500).json({
      error: "Failed to clear cart",
      message: error.message
    })
  }
}

module.exports = {
  getCartItems,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
}