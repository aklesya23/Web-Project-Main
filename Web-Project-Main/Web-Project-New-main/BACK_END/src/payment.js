const request = require('request');
const pool = require('./database');

// Initialize Chapa payment
async function initializePayment(req, res) {
  try {
    const userId = req.user.userId;
    const { amount, email, first_name, last_name, phone_number, cart_items } = req.body;

    console.log("[PAYMENT] Initializing Chapa payment for user:", userId);

    // Generate unique transaction reference
    const tx_ref = `chapa-${userId}-${Date.now()}`;

    const options = {
      'method': 'POST',
      'url': 'https://api.chapa.co/v1/transaction/initialize',
      'headers': {
        'Authorization': `Bearer ${process.env.CHAPA_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        "amount": amount,
        "currency": "ETB",
        "email": email,
        "first_name": first_name,
        "last_name": last_name,
        "phone_number": phone_number,
        "tx_ref": tx_ref,
        "callback_url": `${process.env.BACKEND_URL}/api/payment/callback`,
        "return_url": `${process.env.FRONTEND_URL}/payment-success.html?tx_ref=${tx_ref}`,
        "customization[title]": "Universal Marketplace Payment",
        "customization[description]": "Payment for your order",
        "meta[hide_receipt]": "false"
      })
    };

    request(options, function (error, response) {
      if (error) {
        console.error("[PAYMENT] Chapa API error:", error);
        return res.status(500).json({
          error: "Payment initialization failed",
          message: error.message
        });
      }

      try {
        const responseBody = JSON.parse(response.body);
        console.log("[PAYMENT] Chapa response:", responseBody);

        if (responseBody.status === 'success') {
          res.json({
            success: true,
            message: "Payment initialized successfully",
            data: responseBody.data,
            checkout_url: responseBody.data.checkout_url,
            tx_ref: tx_ref
          });
        } else {
          res.status(400).json({
            error: "Payment initialization failed",
            message: responseBody.message
          });
        }
      } catch (parseError) {
        console.error("[PAYMENT] Error parsing Chapa response:", parseError);
        res.status(500).json({
          error: "Invalid response from payment gateway"
        });
      }
    });
  } catch (error) {
    console.error("[PAYMENT] Error initializing payment:", error);
    res.status(500).json({
      error: "Failed to initialize payment",
      message: error.message
    });
  }
}

// Handle Chapa callback
async function handlePaymentCallback(req, res) {
  try {
    const { tx_ref, status, reference } = req.body;
    console.log("[PAYMENT] Callback received:", { tx_ref, status, reference });

    if (status === 'success') {
      // Extract user ID from tx_ref (format: "chapa-{userId}-{timestamp}")
      const userId = tx_ref.split('-')[1];
      
      if (!userId) {
        throw new Error("Invalid transaction reference");
      }

      // Get cart items for the user
      const cartItems = await getCartItemsByUserId(userId);

      // Update stock for each item
      for (const item of cartItems) {
        try {
          await updateProductStock(item.product_id, item.quantity);
        } catch (error) {
          console.error(`[PAYMENT] Failed to update stock for product ${item.product_id}:`, error);
        }
      }

      // Clear the user's cart
      await clearCartByUserId(userId);

      res.json({
        success: true,
        message: "Payment successful, stock updated, and cart cleared"
      });
    } else {
      res.status(400).json({
        error: "Payment was not successful"
      });
    }
  } catch (error) {
    console.error("[PAYMENT] Error in callback handler:", error);
    res.status(500).json({
      error: "Payment processing failed",
      message: error.message
    });
  }
}

// Verify payment status
async function verifyPayment(req, res) {
  try {
    const userId = req.user.userId;
    const { tx_ref } = req.params;
    console.log("[PAYMENT] Verifying payment for user:", userId, "tx_ref:", tx_ref);

    const options = {
      'method': 'GET',
      'url': `https://api.chapa.co/v1/transaction/verify/${tx_ref}`,
      'headers': {
        'Authorization': `Bearer ${process.env.CHAPA_SECRET_KEY}`
      }
    };

    request(options, async function (error, response) {
      if (error) {
        console.error("[PAYMENT] Verification error:", error);
        return res.status(500).json({
          error: "Verification failed",
          message: error.message
        });
      }

      const verifyData = JSON.parse(response.body);
      console.log("[PAYMENT] Verification response:", verifyData);

      // If payment is successful, decrement stock and clear cart
      if (verifyData.status === 'success' && verifyData.data && verifyData.data.status === 'success') {
        try {
          const cartItems = await getCartItemsByUserId(userId);
          console.log(`[PAYMENT] Processing ${cartItems.length} cart items for user ${userId}`);
          
          for (const item of cartItems) {
            try {
              await updateProductStock(item.product_id, item.quantity);
            } catch (stockError) {
              console.error(`[PAYMENT] Failed to update stock for product ${item.product_id}:`, stockError);
            }
          }

          // Clear the user's cart after successful payment
          await clearCartByUserId(userId);
          console.log("[PAYMENT] Stock updated and cart cleared after successful payment");
        } catch (updateError) {
          console.error("[PAYMENT] Error updating stock after payment:", updateError);
        }
      }

      res.json(verifyData);
    });
  } catch (error) {
    console.error("[PAYMENT] Error verifying payment:", error);
    res.status(500).json({
      error: "Failed to verify payment",
      message: error.message
    });
  }
}

// Update product stock after successful payment
async function updateProductStock(productId, quantity) {
  try {
    const query = `
      UPDATE products 
      SET stock_quantity = stock_quantity - $1
      WHERE id = $2
      RETURNING *`;
    
    const result = await pool.query(query, [quantity, productId]);
    console.log(`[PAYMENT] Updated stock for product ${productId}: ${result.rows[0].stock_quantity} remaining`);
    return result.rows[0];
  } catch (error) {
    console.error(`[PAYMENT] Error updating stock for product ${productId}:`, error);
    throw error;
  }
}

// Get cart items by user ID
async function getCartItemsByUserId(userId) {
  const query = `
    SELECT ci.*, p.name, p.price 
    FROM cart_items ci
    JOIN products p ON ci.product_id = p.id
    WHERE ci.user_id = $1`;
  const result = await pool.query(query, [userId]);
  return result.rows;
}

// Clear cart by user ID
async function clearCartByUserId(userId) {
  const query = `
    DELETE FROM cart_items 
    WHERE user_id = $1
    RETURNING *`;
  const result = await pool.query(query, [userId]);
  console.log(`[PAYMENT] Cleared ${result.rowCount} items from user ${userId}'s cart`);
  return result.rows;
}

module.exports = {
  initializePayment,
  handlePaymentCallback,
  verifyPayment
};