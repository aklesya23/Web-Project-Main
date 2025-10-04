console.log("[v0] Frontend main.js loaded successfully")

// Go back to admin panel from sell page
function goBackToAdmin() {
  window.location.href = "Admin.html"
}

// Global variables for marketplace
let allProducts = []
let filteredProducts = []
let selectedCategories = []
let selectedPriceRanges = []

// Cart functionality
let cart = []

// Update cart counter in navigation
function updateCartCounter() {
  const cartLinks = document.querySelectorAll('nav ul li a[href="cart.html"]')
  cartLinks.forEach((cartLink) => {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0)

    // Remove existing counter if it exists
    const existingCounter = cartLink.querySelector(".cart-counter")
    if (existingCounter) {
      existingCounter.remove()
    }

    // Add counter if there are items
    if (totalItems > 0) {
      const counter = document.createElement("span")
      counter.className = "cart-counter"
      counter.textContent = totalItems
      cartLink.appendChild(counter)
    }
  })
}

// Load cart from database
async function loadCartFromDatabase() {
  const authToken = localStorage.getItem("authToken")
  
  if (!authToken) {
    cart = []
    updateCartCounter()
    return
  }

  try {
    const response = await fetch("http://localhost:5000/api/cart", {
      headers: {
        "Authorization": `Bearer ${authToken}`
      }
    })

    if (response.ok) {
      const data = await response.json()
      cart = data.cart.map(item => ({
        cart_item_id: item.cart_item_id,
        id: item.product_id,
        name: item.name,
        description: item.description,
        price: item.price,
        category: item.category,
        image_url: item.image_url,
        quantity: item.quantity,
        stock_quantity: item.stock_quantity
      }))
      console.log("[v0] Cart loaded from database:", cart.length, "items")
      updateCartCounter()
    } else {
      console.error("[v0] Failed to load cart from database")
      cart = []
      updateCartCounter()
    }
  } catch (error) {
    console.error("[v0] Error loading cart:", error)
    cart = []
    updateCartCounter()
  }
}

// In FRONT_END/js/main.js
async function handleCheckout() {
  try {
    console.log("[v0] Checkout button clicked");
    const authToken = localStorage.getItem("authToken");
    const userData = localStorage.getItem("user");

    if (!authToken || !userData) {
      alert("Please log in to proceed to checkout");
      window.location.href = "Login.html";
      return;
    }

    // Get cart from database
    await loadCartFromDatabase();
    console.log("Current cart (from DB):", cart);

    if (cart.length === 0) {
      alert("Your cart is empty!");
      return;
    }

    // Calculate total
    const cartTotal = cart.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);

    // Confirm checkout
    const confirmCheckout = confirm(
      `You are about to checkout ${cart.length} item(s). Total: ${cartTotal.toFixed(2)} ETB. Continue to payment?`
    );

    if (!confirmCheckout) return;

    console.log("[v0] Processing checkout...");

    // Parse user data
    const user = JSON.parse(userData);

    // Prepare payment data
    const paymentData = {
      amount: cartTotal.toFixed(2),
      email: user.email,
      first_name: user.full_name.split(' ')[0] || 'Customer',
      last_name: user.full_name.split(' ').slice(1).join(' ') || 'User',
      phone_number: user.phone || '0900000000',
      cart_items: cart.map(item => ({
        product_id: item.id,
        quantity: item.quantity,
        price: item.price
      }))
    };

    console.log("[v0] Initializing payment:", paymentData);

    // Initialize payment with Chapa
    const response = await fetch("http://localhost:5000/api/payment/initialize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(paymentData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to initialize payment");
    }

    const data = await response.json();
    console.log("[v0] Payment initialized:", data);

    if (data.success && data.checkout_url) {
      // Store transaction reference for verification
      localStorage.setItem("pending_tx_ref", data.tx_ref);
      
      // Redirect to Chapa payment page
      window.location.href = data.checkout_url;
    } else {
      throw new Error("Failed to get payment URL");
    }
  } catch (error) {
    console.error("[v0] Checkout error:", error);
    alert("Checkout failed: " + error.message + "\nPlease try again or contact support.");
  }
}

// Add product to cart (updated to use database)
async function addToCart(productId) {
  console.log("[v0] Adding product to cart:", productId)

  // Check if user is logged in
  const authToken = localStorage.getItem("authToken")
  const userData = localStorage.getItem("user")

  if (!authToken || !userData) {
    // User is not logged in, show login prompt
    const shouldRedirect = confirm(
      "You need to be logged in to add items to your cart. Would you like to go to the login page?",
    )
    if (shouldRedirect) {
      window.location.href = "Login.html"
    }
    return
  }

  // Find the product in allProducts array
  const product = allProducts.find((p) => p.id == productId)
  if (!product) {
    console.error("[v0] Product not found:", productId)
    return
  }

  try {
    const response = await fetch("http://localhost:5000/api/cart", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`
      },
      body: JSON.stringify({
        product_id: productId,
        quantity: 1
      })
    })

    if (response.ok) {
      const data = await response.json()
      console.log("[v0] Item added to cart:", data)
      
      // Reload cart from database
      await loadCartFromDatabase()
      
      // Show notification
      showCartNotification(data.message || `${product.name} added to cart!`)
    } else {
      const error = await response.json()
      alert(error.error || "Failed to add item to cart")
    }
  } catch (error) {
    console.error("[v0] Error adding to cart:", error)
    alert("Failed to add item to cart. Please try again.")
  }
}

// Show cart notification
function showCartNotification(message) {
  // Remove existing notification if any
  const existingNotification = document.querySelector('.cart-notification')
  if (existingNotification) {
    existingNotification.remove()
  }

  // Create notification element
  const notification = document.createElement('div')
  notification.className = 'cart-notification'
  notification.innerHTML = `
    <i class='bx bx-check-circle'></i>
    <span>${message}</span>
  `
  document.body.appendChild(notification)

  // Show notification
  setTimeout(() => {
    notification.classList.add('show')
  }, 10)

  // Hide and remove notification after 3 seconds
  setTimeout(() => {
    notification.classList.remove('show')
    setTimeout(() => {
      notification.remove()
    }, 300)
  }, 3000)
}

// Remove product from cart (updated to use database)
async function removeFromCart(cartItemId) {
  console.log("[v0] Removing cart item:", cartItemId)

  const authToken = localStorage.getItem("authToken")
  if (!authToken) {
    alert("Please log in to manage your cart")
    return
  }

  try {
    const response = await fetch(`http://localhost:5000/api/cart/${cartItemId}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${authToken}`
      }
    })

    if (response.ok) {
      console.log("[v0] Item removed from cart")
      
      // Reload cart from database
      await loadCartFromDatabase()
      
      // Refresh cart display if on cart page
      if (document.body.classList.contains("Cart")) {
        displayCartItems()
      }
    } else {
      const error = await response.json()
      alert(error.error || "Failed to remove item from cart")
    }
  } catch (error) {
    console.error("[v0] Error removing from cart:", error)
    alert("Failed to remove item from cart. Please try again.")
  }
}

// Update quantity in cart (updated to use database)
async function updateCartQuantity(cartItemId, newQuantity) {
  console.log("[v0] Updating cart quantity:", cartItemId, newQuantity)

  if (newQuantity <= 0) {
    removeFromCart(cartItemId)
    return
  }

  const authToken = localStorage.getItem("authToken")
  if (!authToken) {
    alert("Please log in to manage your cart")
    return
  }

  try {
    const response = await fetch(`http://localhost:5000/api/cart/${cartItemId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`
      },
      body: JSON.stringify({ quantity: newQuantity })
    })

    if (response.ok) {
      console.log("[v0] Cart quantity updated")
      
      // Reload cart from database
      await loadCartFromDatabase()
      
      // Refresh cart display if on cart page
      if (document.body.classList.contains("Cart")) {
        displayCartItems()
      }
    } else {
      const error = await response.json()
      alert(error.error || "Failed to update quantity")
      
      // Reload to show correct quantity
      await loadCartFromDatabase()
      if (document.body.classList.contains("Cart")) {
        displayCartItems()
      }
    }
  } catch (error) {
    console.error("[v0] Error updating cart quantity:", error)
    alert("Failed to update quantity. Please try again.")
  }
}

// Display cart items on cart page
function displayCartItems() {
  const productContainer = document.querySelector(".product-container")
  const checkoutButton = document.querySelector(".main-container button")

  if (!productContainer) return

  if (cart.length === 0) {
    productContainer.innerHTML = `
      <div class="empty-cart">
        <h2>Your cart is empty</h2>
        <p>Add some products to your cart to see them here.</p>
        <a href="Marketplace.html" class="continue-shopping-btn">Continue Shopping</a>
      </div>
    `
    if (checkoutButton) {
      checkoutButton.style.display = "none"
    }
    return
  }

  const cartTotal = cart.reduce((sum, item) => sum + Number.parseFloat(item.price) * item.quantity, 0)

  productContainer.innerHTML = cart
    .map(
      (item) => `
    <div class="cart-item" data-cart-item-id="${item.cart_item_id}">
      <img src="${item.image_url || "/placeholder.svg?height=100&width=100"}" alt="${item.name}">
      <div class="item-details">
        <h3>${item.name}</h3>
        <p class="category">${item.category}</p>
        <p class="price">${Number.parseFloat(item.price).toFixed(2)} ETB</p>
        <p class="description">${item.description || "No description available"}</p>
      </div>
      <div class="quantity-controls">
        <button class="quantity-btn" onclick="updateCartQuantity(${item.cart_item_id}, ${item.quantity - 1})">-</button>
        <span class="quantity">${item.quantity}</span>
        <button class="quantity-btn" onclick="updateCartQuantity(${item.cart_item_id}, ${item.quantity + 1})">+</button>
      </div>
      <div class="item-total">
        <p class="item-price">${(Number.parseFloat(item.price) * item.quantity).toFixed(2)} ETB</p>
        <button class="remove-btn" onclick="removeFromCart(${item.cart_item_id})">Remove from cart</button>
      </div>
    </div>
  `,
    )
    .join("")

  // Add cart summary
  const cartSummary = document.createElement("div")
  cartSummary.className = "cart-summary"
  cartSummary.innerHTML = `
    <div class="summary-row">
      <span>Total Items: ${cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
    </div>
    <div class="summary-row total">
      <span>Total: ${cartTotal.toFixed(2)} ETB</span>
    </div>
  `
  productContainer.appendChild(cartSummary)

  if (checkoutButton) {
    checkoutButton.style.display = "block"
    checkoutButton.onclick = handleCheckout
  }
}

// Initialize cart functionality
// Initialize cart functionality
async function initializeCart() {
  console.log("[v0] Initializing cart functionality")

  // Load cart from database if user is logged in
  await loadCartFromDatabase()

  // If on cart page, display cart items
  if (document.body.classList.contains("Cart")) {
    displayCartItems()
  }
}

function initializeSellPage() {
  // Image URL field is now a simple text input, no special initialization needed
  console.log("[v0] Sell page initialized with image URL input")
}

// Update navbar for auth state
function updateNavbarForAuthState() {
  const authToken = localStorage.getItem("authToken")
  const userData = localStorage.getItem("user")
  const loginLink = document.querySelector("nav ul li:last-child")

  if (authToken && userData) {
    try {
      const user = JSON.parse(userData)
      const userName = user.full_name || user.username || user.email || "User"
      const userEmail = user.email || ""

      const getInitials = (name) => {
        return name
          .split(" ")
          .map((word) => word.charAt(0).toUpperCase())
          .slice(0, 2)
          .join("")
      }

      const userInitials = getInitials(userName)

      loginLink.innerHTML = `
        <div class="profile-dropdown">
          <button class="profile-btn" id="profileBtn" title="${userName}${userEmail ? "\n" + userEmail : ""}">
            <div class="profile-avatar">${userInitials}</div>
            <i class='bx bx-chevron-down'></i>
          </button>
          <div class="dropdown-menu" id="profileDropdown">
            <div class="dropdown-header">
              <div class="user-info">
                <div class="user-name">${userName}</div>
                ${userEmail ? `<div class="user-email">${userEmail}</div>` : ""}
              </div>
            </div>
            <hr class="dropdown-divider">
            <a href="#" class="dropdown-item sign-out-item" id="signOutBtn">
              <i class='bx bx-log-out'></i>
              Sign Out
            </a>
          </div>
        </div>
      `

      // Add event listeners for dropdown functionality
      const profileBtn = document.getElementById("profileBtn")
      const profileDropdown = document.getElementById("profileDropdown")
      const signOutBtn = document.getElementById("signOutBtn")

      // Toggle dropdown on profile button click
      profileBtn.addEventListener("click", (e) => {
        e.preventDefault()
        e.stopPropagation()
        profileDropdown.classList.toggle("show")
      })

      // Close dropdown when clicking outside
      document.addEventListener("click", (e) => {
        if (!profileBtn.contains(e.target) && !profileDropdown.contains(e.target)) {
          profileDropdown.classList.remove("show")
        }
      })

      // Handle sign out
      signOutBtn.addEventListener("click", (e) => {
        e.preventDefault()
        handleSignOut()
      })
    } catch (error) {
      console.error("[v0] Error parsing user data:", error)
      // Fallback to login link if user data is corrupted
      showLoginLink()
    }
  } else {
    showLoginLink()
  }
}

function showLoginLink() {
  const loginLink = document.querySelector("nav ul li:last-child")
  loginLink.innerHTML = '<a href="Login.html">Login</a>'
}

// Update hero logout button visibility
function updateHeroLogoutButton() {
  const heroLogoutBtn = document.getElementById("heroLogoutBtn")
  if (heroLogoutBtn) {
    const authToken = localStorage.getItem("authToken")
    const userData = localStorage.getItem("user")
    
    if (authToken && userData) {
      heroLogoutBtn.style.display = "inline-block"
      console.log("[v0] Hero logout button shown")
    } else {
      heroLogoutBtn.style.display = "none"
      console.log("[v0] Hero logout button hidden")
    }
  }
}

async function handleSignOut() {
  const authToken = localStorage.getItem("authToken")
  
  // Clear cart from database before logging out
  if (authToken) {
    try {
      await fetch("http://localhost:5000/api/cart", {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${authToken}`
        }
      })
      console.log("[v0] Cart cleared from database")
    } catch (error) {
      console.error("[v0] Error clearing cart:", error)
    }
  }
  
  // Clear authentication data
  localStorage.removeItem("authToken")
  localStorage.removeItem("user")
  localStorage.removeItem("users")
  
  // Clear local cart
  cart = []
  
  // Update cart counter to show empty cart
  updateCartCounter()

  console.log("[v0] User signed out successfully - cart cleared")

  // Update navbar immediately
  showLoginLink()
  
  // Hide hero logout button if on home page
  updateHeroLogoutButton()

  // Redirect to home page after a short delay
  setTimeout(() => {
    window.location.href = "index.html"
  }, 300)
}

// Fetch products from the backend API
async function fetchProducts(filters = {}) {
  try {
    console.log("[v0] Fetching products with filters:", filters)

    const queryParams = new URLSearchParams()

    // Add category filters
    if (filters.categories && filters.categories.length > 0) {
      queryParams.append("categories", filters.categories.join(","))
    }

    // Add price range filters
    if (filters.minPrice) queryParams.append("minPrice", filters.minPrice)
    if (filters.maxPrice) queryParams.append("maxPrice", filters.maxPrice)

    // Add search filter
    if (filters.search) queryParams.append("search", filters.search)

    const url = `http://localhost:5000/api/products${queryParams.toString() ? "?" + queryParams.toString() : ""}`
    console.log("[v0] Fetching from URL:", url)

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    console.log("[v0] Products fetched successfully:", data)

    return data.products || []
  } catch (error) {
    console.error("[v0] Error fetching products:", error)
    showError("Failed to load products. Please check if the backend server is running.")
    return []
  }
}

// Display products in the marketplace
function displayProducts(products) {
  const cardsContainer = document.querySelector(".cards")
  const productsCount = document.getElementById("productsCount")

  if (!cardsContainer) {
    console.error("[v0] Cards container not found")
    return
  }

  // Update products count
  if (productsCount) {
    productsCount.textContent = `${products.length} product${products.length !== 1 ? "s" : ""} found`
  }

  if (!products || products.length === 0) {
    cardsContainer.innerHTML = `
      <div class="no-products">
        <h3>No products found</h3>
        <p>Try adjusting your filters or check back later.</p>
      </div>
    `
    return
  }

  cardsContainer.innerHTML = products
    .map((product) => {
      const stockQuantity = product.stock_quantity || 0
      const stockClass = stockQuantity === 0 ? "out-of-stock" : stockQuantity < 10 ? "low-stock" : ""
      const stockText = stockQuantity === 0 ? "Out of Stock" : `${stockQuantity} in stock`
      const buttonDisabled = stockQuantity === 0 ? "disabled" : ""

      return `
    <div class="product-card" data-category="${product.category}" data-price="${product.price}">
      <img src="${product.image_url || "/placeholder.svg?height=200&width=200"}" alt="${product.name}" loading="lazy">
      <h3>${product.name}</h3>
      <p class="category">${product.category}</p>
      <p class="price">${Number.parseFloat(product.price).toFixed(2)} ETB</p>
      <p class="quantity ${stockClass}">${stockText}</p>
      <p class="description">${product.description || "No description available"}</p>
      <button class="add-to-cart-btn" data-product-id="${product.id}" ${buttonDisabled}>
        ${stockQuantity === 0 ? "Out of Stock" : "Add to cart"}
      </button>
    </div>
  `
    })
    .join("")

  // Add event listeners to "Add to cart" buttons
  const addToCartButtons = cardsContainer.querySelectorAll(".add-to-cart-btn:not([disabled])")
  addToCartButtons.forEach((button) => {
    button.addEventListener("click", (e) => {
      const productId = e.target.getAttribute("data-product-id")
      addToCart(productId)
    })
  })
}

// Show error message
function showError(message) {
  const cardsContainer = document.querySelector(".cards")
  const productsCount = document.getElementById("productsCount")

  if (cardsContainer) {
    cardsContainer.innerHTML = `
      <div class="error-message">
        <h3>Error</h3>
        <p>${message}</p>
      </div>
    `
  }

  if (productsCount) {
    productsCount.textContent = "Error loading products"
  }
}

// Initialize marketplace page
async function initializeMarketplace() {
  console.log("[v0] Initializing marketplace")

  // Show loading state
  const cardsContainer = document.querySelector(".cards")
  const productsCount = document.getElementById("productsCount")

  if (cardsContainer) {
    cardsContainer.innerHTML = '<div class="loading-spinner"><p>Loading products...</p></div>'
  }

  if (productsCount) {
    productsCount.textContent = "Loading..."
  }

  // Fetch and display all products initially
  allProducts = await fetchProducts()
  filteredProducts = [...allProducts]
  displayProducts(filteredProducts)

  // Update the selected count
  updateSelectedCount()
}

// Update the selected filters count
function updateSelectedCount() {
  const countSpan = document.getElementById("selectedCount")
  if (countSpan) {
    const categoryCheckboxes = document.querySelectorAll('.Categories .check-list input[type="checkbox"]:checked')
    const priceCheckboxes = document.querySelectorAll('.Categories + div .check-list input[type="checkbox"]:checked')
    const totalSelected = categoryCheckboxes.length + priceCheckboxes.length
    countSpan.textContent = `${totalSelected} selected`
    console.log("[v0] Updated selection count:", totalSelected)
  }
}

// Select all filters
function selectAllFilters() {
  const categoryCheckboxes = document.querySelectorAll('.Categories .check-list input[type="checkbox"]')
  const priceCheckboxes = document.querySelectorAll('.Categories + div .check-list input[type="checkbox"]')

  console.log("[v0] Selecting all filters - categories:", categoryCheckboxes.length, "price:", priceCheckboxes.length)

  categoryCheckboxes.forEach((checkbox) => {
    checkbox.checked = true
    console.log("[v0] Selected category checkbox:", checkbox.id)
  })

  priceCheckboxes.forEach((checkbox) => {
    checkbox.checked = true
    console.log("[v0] Selected price checkbox:", checkbox.id)
  })

  applyFilters()
}

// Clear all filters
function clearAllFilters() {
  const categoryCheckboxes = document.querySelectorAll('.Categories .check-list input[type="checkbox"]')
  const priceCheckboxes = document.querySelectorAll('.Categories + div .check-list input[type="checkbox"]')

  console.log("[v0] Clearing all filters - categories:", categoryCheckboxes.length, "price:", priceCheckboxes.length)

  categoryCheckboxes.forEach((checkbox) => {
    checkbox.checked = false
    console.log("[v0] Cleared category checkbox:", checkbox.id)
  })

  priceCheckboxes.forEach((checkbox) => {
    checkbox.checked = false
    console.log("[v0] Cleared price checkbox:", checkbox.id)
  })

  selectedCategories = []
  selectedPriceRanges = []

  // Clear search input
  const searchInput = document.getElementById("searchInput")
  if (searchInput) {
    searchInput.value = ""
  }

  // Fetch all products without filters
  initializeMarketplace()
}

// Apply filters based on selected checkboxes
async function applyFilters() {
  console.log("[v0] Applying filters")

  // Show loading state
  const cardsContainer = document.querySelector(".cards")
  const productsCount = document.getElementById("productsCount")

  if (cardsContainer) {
    cardsContainer.innerHTML = '<div class="loading-spinner"><p>Filtering products...</p></div>'
  }

  if (productsCount) {
    productsCount.textContent = "Filtering..."
  }

  // Get selected categories using more specific selectors
  const categoryCheckboxes = document.querySelectorAll('.Categories .check-list input[type="checkbox"]:checked')
  selectedCategories = []

  categoryCheckboxes.forEach((checkbox) => {
    const label = checkbox.parentElement
    if (label && label.tagName === "LABEL") {
      const labelText = label.textContent.trim()
      selectedCategories.push(labelText)
    }
  })

  // Get selected price ranges using more specific selectors
  const priceCheckboxes = document.querySelectorAll('.Categories + div .check-list input[type="checkbox"]:checked')
  selectedPriceRanges = []

  priceCheckboxes.forEach((checkbox) => {
    const label = checkbox.parentElement
    if (label && label.tagName === "LABEL") {
      const labelText = label.textContent.trim()
      selectedPriceRanges.push(labelText)
    }
  })

  console.log("[v0] Selected categories:", selectedCategories)
  console.log("[v0] Selected price ranges:", selectedPriceRanges)

  // Build filters object
  const filters = {}

  // Add category filters
  if (selectedCategories.length > 0) {
    filters.categories = selectedCategories
  }

  // Add price range filters
  if (selectedPriceRanges.length > 0) {
    // Convert price range labels to min/max values
    let minPrice = null
    let maxPrice = null

    selectedPriceRanges.forEach((range) => {
      switch (range) {
        case ">500ETB":
          if (!minPrice || minPrice < 500) minPrice = 500
          break
        case "500-1500":
          if (!minPrice || minPrice < 500) minPrice = 500
          if (!maxPrice || maxPrice > 1500) maxPrice = 1500
          break
        case "1500-2500":
          if (!minPrice || minPrice < 1500) minPrice = 1500
          if (!maxPrice || maxPrice > 2500) maxPrice = 2500
          break
        case "2500-5000":
          if (!minPrice || minPrice < 2500) minPrice = 2500
          if (!maxPrice || maxPrice > 5000) maxPrice = 5000
          break
        case "5000-10000":
          if (!minPrice || minPrice < 5000) minPrice = 5000
          if (!maxPrice || maxPrice > 10000) maxPrice = 10000
          break
        case ">10000":
          if (!minPrice || minPrice < 10000) minPrice = 10000
          break
      }
    })

    if (minPrice !== null) filters.minPrice = minPrice
    if (maxPrice !== null) filters.maxPrice = maxPrice
  }

  // Add search filter
  const searchInput = document.getElementById("searchInput")
  if (searchInput && searchInput.value.trim()) {
    filters.search = searchInput.value.trim()
  }

  console.log("[v0] Final filters object:", filters)

  // Fetch filtered products
  filteredProducts = await fetchProducts(filters)
  displayProducts(filteredProducts)
  updateSelectedCount()
}

function performSearch() {
  applyFilters()
}

function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

async function handleSellForm(event) {
  if (event) {
  event.preventDefault()
  }
  console.log("[v0] Sell form submitted")
  console.log("[v0] Event:", event)

  // Get auth token if available (optional for admin access)
  const authToken = localStorage.getItem("authToken")
  console.log("[v0] Auth token:", authToken ? "Found" : "Not found")

  const form = document.getElementById("sellForm")
  const submitBtn = document.getElementById("submitBtn")
  const errors = form.querySelectorAll("small.error")

  console.log("[v0] Form elements found:")
  console.log("[v0] - Form:", form)
  console.log("[v0] - Submit button:", submitBtn)
  console.log("[v0] - Error elements:", errors.length)

  // Clear previous errors
  errors.forEach((error) => {
    error.textContent = ""
    error.style.visibility = "hidden"
  })

  const imageUrl = document.getElementById("itemImageUrl").value.trim()
  console.log("[v0] Image URL:", imageUrl)

  const formData = {
    name: document.getElementById("itemName").value.trim(),
    price: Number.parseFloat(document.getElementById("itemPrice").value),
    description: document.getElementById("itemDescription").value.trim(),
    category: document.getElementById("itemCategory").value,
    stock_quantity: Number.parseInt(document.getElementById("stockQuantity").value) || 1,
    image_url: imageUrl || "/placeholder.svg?height=300&width=300", // Use provided URL or default placeholder
  }

  console.log("[v0] Form data collected:")
  console.log("[v0] - Name:", formData.name)
  console.log("[v0] - Price:", formData.price)
  console.log("[v0] - Description:", formData.description)
  console.log("[v0] - Category:", formData.category)
  console.log("[v0] - Stock:", formData.stock_quantity)
  console.log("[v0] - Image URL:", formData.image_url)

  // Basic validation
  let isValid = true
  
  // Validate item name
  if (!formData.name || formData.name.trim().length === 0) {
    document.getElementById("itemName").nextElementSibling.textContent = "Item name is required"
    document.getElementById("itemName").nextElementSibling.style.visibility = "visible"
    isValid = false
  }
  
  // Validate price
  if (!formData.price || formData.price <= 0 || isNaN(formData.price)) {
    document.getElementById("itemPrice").nextElementSibling.textContent = "Valid price is required"
    document.getElementById("itemPrice").nextElementSibling.style.visibility = "visible"
    isValid = false
  }
  
  // Validate category
  if (!formData.category || formData.category.trim().length === 0) {
    document.getElementById("itemCategory").nextElementSibling.textContent = "Category is required"
    document.getElementById("itemCategory").nextElementSibling.style.visibility = "visible"
    isValid = false
  }
  
  // Validate terms agreement
  if (!document.getElementById("terms").checked) {
    const termsError = document.querySelector("#terms").parentElement.nextElementSibling
    if (termsError) {
      termsError.textContent = "You must agree to the terms"
      termsError.style.visibility = "visible"
    }
    isValid = false
  }
  
  // Validate image URL format if provided
  if (imageUrl && imageUrl.trim().length > 0) {
    try {
      new URL(imageUrl)
    } catch (e) {
      document.getElementById("itemImageUrl").nextElementSibling.textContent = "Please enter a valid URL"
      document.getElementById("itemImageUrl").nextElementSibling.style.visibility = "visible"
      isValid = false
    }
  }

  if (!isValid) return

  // Disable submit button
  submitBtn.disabled = true
  submitBtn.textContent = "Listing Item..."

  try {
    console.log("[v0] Sending product data to backend:", formData)
    console.log("[v0] Form data validation passed, proceeding with API call")

    // Send to backend API
    const headers = {
      "Content-Type": "application/json",
    }
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`
      console.log("[v0] Using authentication token for request")
    } else {
      console.log("[v0] No authentication token, making unauthenticated request")
    }

    const response = await fetch("http://localhost:5000/api/products", {
      method: "POST",
      headers,
      body: JSON.stringify(formData),
    })
    
    console.log("[v0] API response status:", response.status)
    console.log("[v0] API response ok:", response.ok)

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    console.log("[v0] Item listed successfully:", data)

    // Show success confirmation with more details
    const confirmationMessage = `✅ Item Successfully Listed!

📦 Product: ${formData.name}
💰 Price: ${formData.price} ETB
📂 Category: ${formData.category}
🆔 Product ID: ${data.id || 'N/A'}

Your item has been added to the database and is now available in the marketplace. Redirecting to admin panel...`

    alert(confirmationMessage)

    // Redirect to admin panel after successful listing
    window.location.href = "Admin.html"
  } catch (error) {
    console.error("[v0] Error listing item:", error)
    alert("Failed to list item: " + error.message + "\nPlease ensure the backend server is running.")
  } finally {
    submitBtn.disabled = false
    submitBtn.textContent = "List Item"
  }
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("[v0] DOM loaded, initializing authentication")

  // Update navbar based on auth state
  updateNavbarForAuthState()

  initializeCart()

  // Initialize Home page specific functionality
  if (document.body.classList.contains("Home")) {
    console.log("[v0] Home page detected, ensuring navbar is updated...")
    // Ensure navbar is updated for home page
    updateNavbarForAuthState()
    // Show/hide hero logout button based on auth state
    updateHeroLogoutButton()
  }

  if (document.body.classList.contains("Marketplace")) {
    console.log("[v0] Marketplace page detected, initializing...")
    initializeMarketplace()

    // Add event listeners to filter checkboxes with more specific selectors
    const categoryCheckboxes = document.querySelectorAll('.Categories .check-list input[type="checkbox"]')
    const priceCheckboxes = document.querySelectorAll('.Categories + div .check-list input[type="checkbox"]')

    console.log("[v0] Found category checkboxes:", categoryCheckboxes.length)
    console.log("[v0] Found price checkboxes:", priceCheckboxes.length)

    // Add event listeners to category checkboxes
    categoryCheckboxes.forEach((checkbox, index) => {
      console.log("[v0] Adding listener to category checkbox:", checkbox.id)
      checkbox.addEventListener("change", (e) => {
        console.log("[v0] Category checkbox changed:", e.target.id, e.target.checked)
        updateSelectedCount() // Update counter on change
      })
    })

    // Add event listeners to price range checkboxes
    priceCheckboxes.forEach((checkbox, index) => {
      console.log("[v0] Adding listener to price checkbox:", checkbox.id)
      checkbox.addEventListener("change", (e) => {
        console.log("[v0] Price checkbox changed:", e.target.id, e.target.checked)
        updateSelectedCount() // Update counter on change
      })
    })

    const searchInput = document.getElementById("searchInput")
    if (searchInput) {
      const debouncedSearch = debounce(applyFilters, 500)
      searchInput.addEventListener("input", debouncedSearch)

      // Also trigger search on Enter key
      searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          e.preventDefault()
          applyFilters()
        }
      })
    }
  }

  if (document.body.classList.contains("Sell")) {
    console.log("[v0] Sell page detected, initializing...")
    initializeSellPage()
    console.log("[v0] Sell page initialized - button click handler attached via onclick")
  }

  // --- LOGIN PAGE LOGIC ---
  const form = document.getElementById("loginForm")
  const username = document.getElementById("username")
  const password = document.getElementById("password")
  const toggle = document.getElementById("togglePassword")

  if (form && username && password && toggle) {
    console.log("[v0] Login form elements found")
    const usernameError = username.parentElement.querySelector("small.error")
    const passwordError = password.parentElement.querySelector("small.error")

    // Ensure parent containers are positioned so error messages don't push layout
    ;[username.parentElement, password.parentElement].forEach((p) => {
      if (getComputedStyle(p).position === "static") p.style.position = "relative"
    })

    // Style the small.error elements so they overlay instead of pushing content
    ;[usernameError, passwordError].forEach((s) => {
      if (!s) return
      s.style.position = "absolute"
      s.style.left = "50%"
      s.style.transform = "translateX(-50%)"
      s.style.bottom = "-18px"
      s.style.width = "100%"
      s.style.maxWidth = "320px"
      s.style.lineHeight = "18px"
      s.style.fontSize = "0.85rem"
      s.style.textAlign = "center"
      s.style.visibility = s.textContent.trim() ? "visible" : "hidden"
      s.style.display = "block"
    })

    // Show / hide password
    toggle.addEventListener("click", () => {
      const isPassword = password.type === "password"
      password.type = isPassword ? "text" : "password"
      toggle.className = isPassword ? "bx bx-show" : "bx bx-hide"
      toggle.title = isPassword ? "Hide password" : "Show password"
    })

    // Clear error on input
    ;[username, password].forEach((el) => {
      el.addEventListener("input", () => {
        const err = el.parentElement.querySelector("small.error")
        if (err) {
          err.textContent = ""
          err.style.visibility = "hidden"
        }
        el.removeAttribute("aria-invalid")
      })
    })

    // Basic validation on submit (only required checks - no length check)
    form.addEventListener("submit", async (e) => {
      e.preventDefault()
      console.log("[v0] Login form submitted")
      let valid = true

      // Clear previous errors (but keep reserved space)
      ;[usernameError, passwordError].forEach((s) => {
        if (!s) return
        s.textContent = ""
        s.style.visibility = "hidden"
      })

      if (!username.value.trim()) {
        usernameError.textContent = "Username or email is required."
        usernameError.style.visibility = "visible"
        username.setAttribute("aria-invalid", "true")
        valid = false
      }

      if (!password.value) {
        passwordError.textContent = "Password is required."
        passwordError.style.visibility = "visible"
        password.setAttribute("aria-invalid", "true")
        valid = false
      }

      if (!valid) {
        const firstVisibleErr = Array.from(document.querySelectorAll("small.error")).find((s) => s.textContent.trim())
        if (firstVisibleErr) {
          const inputToFocus = firstVisibleErr.parentElement.querySelector("input,textarea,select")
          if (inputToFocus) inputToFocus.focus()
        }
        return
      }

      try {
        console.log("[v0] Attempting login request to backend")
        console.log("[v0] Request URL: http://localhost:5000/api/auth/login")
        console.log("[v0] Request method: POST")
        console.log("[v0] Request headers: Content-Type: application/json")
        console.log("[v0] Request body:", {
          email: username.value.trim(),
          password: "[REDACTED]",
        })

        // Show loading state
        const submitButton = form.querySelector('button[type="submit"]')
        const originalText = submitButton ? submitButton.textContent : ""
        if (submitButton) {
          submitButton.disabled = true
          submitButton.textContent = "Signing in..."
        }

        const response = await fetch("http://localhost:5000/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: username.value.trim(),
            password: password.value,
          }),
        })

        console.log("[v0] Login response status:", response.status)
        console.log("[v0] Login response ok:", response.ok)
        console.log("[v0] Login response headers:", Object.fromEntries(response.headers.entries()))

        // Reset button state
        if (submitButton) {
          submitButton.disabled = false
          submitButton.textContent = originalText
        }

        if (!response.ok) {
          let errorMessage = "Login failed"
          try {
            const data = await response.json()
            console.log("[v0] Error response data:", data)
            errorMessage = data.error || data.message || errorMessage
          } catch (jsonError) {
            console.error("[v0] Failed to parse login error response:", jsonError)
            console.error("[v0] Raw response text:", await response.text().catch(() => "Could not read response"))

            // Provide more specific error messages based on status codes
            if (response.status === 0) {
              errorMessage = "Cannot connect to server. Please check if the backend server is running on port 5000."
            } else if (response.status === 401) {
              errorMessage = "Invalid username or password."
            } else if (response.status === 404) {
              errorMessage = "Login endpoint not found. Please check the backend server."
            } else if (response.status >= 500) {
              errorMessage = "Server error. Please check the database connection and try again."
            } else {
              errorMessage = `Server returned error ${response.status}. Please try again later.`
            }
          }

          passwordError.textContent = errorMessage
          passwordError.style.visibility = "visible"
          return
        }

        const data = await response.json()
        console.log("[v0] Login successful:", {
          ...data,
          token: data.token ? "[TOKEN_RECEIVED]" : "[NO_TOKEN]",
        })

        // Validate response data
        if (!data.token) {
          console.error("[v0] No token received from server")
          passwordError.textContent = "Invalid server response. Please try again."
          passwordError.style.visibility = "visible"
          return
        }

        if (!data.user) {
          console.error("[v0] No user data received from server")
          passwordError.textContent = "Invalid server response. Please try again."
          passwordError.style.visibility = "visible"
          return
        }

        // Store authentication data
        localStorage.setItem("authToken", data.token)
        localStorage.setItem("user", JSON.stringify(data.user))

        console.log("[v0] Authentication data stored successfully")

        try {
          console.log("[v0] Checking admin status...")
          if (submitButton) {
            submitButton.textContent = "Checking permissions..."
          }

          const adminCheckResponse = await fetch("http://localhost:5000/api/auth/check-admin", {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${data.token}`,
            },
          })

          if (adminCheckResponse.ok) {
            const adminData = await adminCheckResponse.json()
            console.log("[v0] Admin check result:", adminData)

            if (adminData.isAdmin) {
              console.log("[v0] User is admin, redirecting to Admin.html")
              if (submitButton) {
                submitButton.textContent = "Welcome Admin! Redirecting..."
              }
              setTimeout(() => {
                window.location.href = "Admin.html"
              }, 500)
              return
            }
          }
        } catch (adminCheckError) {
          console.error("[v0] Error checking admin status:", adminCheckError)
          // Continue with normal redirect if admin check fails
        }

        console.log("[v0] Redirecting to home page...")

        // Show success message briefly before redirect
        if (submitButton) {
          submitButton.textContent = "Success! Redirecting..."
        }

        // Redirect after a short delay to show success message
        setTimeout(() => {
          window.location.href = "index.html"
        }, 500)
      } catch (error) {
        console.error("[v0] Login network error:", error)
        console.error("[v0] Error name:", error.name)
        console.error("[v0] Error message:", error.message)
        console.error("[v0] Error stack:", error.stack)

        // Reset button state
        const submitButton = form.querySelector('button[type="submit"]')
        if (submitButton) {
          submitButton.disabled = false
          submitButton.textContent = "Sign In"
        }

        let errorMessage = "Network error. Please try again."

        if (error.name === "TypeError" && error.message.includes("fetch")) {
          errorMessage =
            "Cannot connect to server. Please ensure:\n1. Backend server is running on port 5000\n2. No firewall is blocking the connection\n3. The server URL is correct"
        } else if (error.message.includes("CORS")) {
          errorMessage = "Server configuration error. Please check CORS settings."
        } else if (error.message.includes("NetworkError")) {
          errorMessage = "Network connection failed. Please check your internet connection."
        } else if (error.name === "AbortError") {
          errorMessage = "Request timed out. Please try again."
        } else if (error.message.includes("Failed to fetch")) {
          errorMessage = "Cannot connect to server. Please check if the backend server is running on port 5000."
        }

        passwordError.textContent = errorMessage
        passwordError.style.visibility = "visible"
      }
    })
  }

  // --- SIGNUP PAGE LOGIC ---
  const signupForm = document.querySelector(".signup-container form")
  if (signupForm) {
    console.log("[v0] Signup form found")

    const name = document.getElementById("signupName")
    const email = document.getElementById("signupEmail")
    const phone = document.getElementById("signupPhone")
    const password = document.getElementById("signupPassword")
    const confirm = document.getElementById("signupConfirmPassword")
    const togglePassword = document.getElementById("toggleSignupPassword")
    const toggleConfirm = document.getElementById("toggleSignupConfirmPassword")
    const fields = [name, email, phone, password, confirm]
    const errors = fields.map((f) => f?.parentElement.querySelector("small.error"))

    // Show/hide password
    if (togglePassword && password) {
      togglePassword.addEventListener("click", () => {
        const isPassword = password.type === "password"
        password.type = isPassword ? "text" : "password"
        togglePassword.className = isPassword ? "bx bx-show" : "bx bx-hide"
        togglePassword.title = isPassword ? "Hide password" : "Show password"
      })
    }
    if (toggleConfirm && confirm) {
      toggleConfirm.addEventListener("click", () => {
        const isPassword = confirm.type === "password"
        confirm.type = isPassword ? "text" : "password"
        toggleConfirm.className = isPassword ? "bx bx-show" : "bx bx-hide"
        toggleConfirm.title = isPassword ? "Hide password" : "Show password"
      })
    }

    // Style error messages
    errors.forEach((s) => {
      if (!s) return
      s.style.position = "absolute"
      s.style.left = "50%"
      s.style.transform = "translateX(-50%)"
      s.style.bottom = "-18px"
      s.style.width = "100%"
      s.style.maxWidth = "320px"
      s.style.lineHeight = "18px"
      s.style.fontSize = "0.85rem"
      s.style.textAlign = "center"
      s.style.visibility = "hidden"
      s.style.display = "block"
    })

    // Clear error on input
    fields.forEach((el, i) => {
      if (!el) return
      el.addEventListener("input", () => {
        const err = errors[i]
        if (err) {
          err.textContent = ""
          err.style.visibility = "hidden"
        }
        el.removeAttribute("aria-invalid")
      })
    })

    // Validation on submit
    signupForm.addEventListener("submit", handleRegistration)
  }
})

async function handleRegistration(event) {
  event.preventDefault()
  console.log("[v0] Signup form submitted")

  const signupForm = document.querySelector(".signup-container form")
  const name = document.getElementById("signupName")
  const email = document.getElementById("signupEmail")
  const phone = document.getElementById("signupPhone")
  const password = document.getElementById("signupPassword")
  const confirm = document.getElementById("signupConfirmPassword")
  const togglePassword = document.getElementById("toggleSignupPassword")
  const toggleConfirm = document.getElementById("toggleSignupConfirmPassword")
  const fields = [name, email, phone, password, confirm]
  const errors = fields.map((f) => f?.parentElement.querySelector("small.error"))

  // Clear previous errors
  errors.forEach((s) => {
    if (s) {
      s.textContent = ""
      s.style.visibility = "hidden"
    }
  })

  let valid = true

  if (!name.value.trim()) {
    errors[0].textContent = "Full name is required."
    errors[0].style.visibility = "visible"
    name.setAttribute("aria-invalid", "true")
    valid = false
  }
  if (!email.value.trim()) {
    errors[1].textContent = "Email address is required."
    errors[1].style.visibility = "visible"
    email.setAttribute("aria-invalid", "true")
    valid = false
  }
  if (!phone.value.trim()) {
    errors[2].textContent = "Phone number is required."
    errors[2].style.visibility = "visible"
    phone.setAttribute("aria-invalid", "true")
    valid = false
  }
  if (!password.value) {
    errors[3].textContent = "Password is required."
    errors[3].style.visibility = "visible"
    password.setAttribute("aria-invalid", "true")
    valid = false
  }
  if (!confirm.value) {
    errors[4].textContent = "Please confirm your password."
    errors[4].style.visibility = "visible"
    confirm.setAttribute("aria-invalid", "true")
    valid = false
  } else if (password.value && confirm.value && password.value !== confirm.value) {
    errors[4].textContent = "Passwords do not match."
    errors[4].style.visibility = "visible"
    confirm.setAttribute("aria-invalid", "true")
    valid = false
  }

  if (!valid) {
    const firstVisibleErr = errors.find((s) => s && s.textContent.trim())
    if (firstVisibleErr) {
      const inputToFocus = firstVisibleErr.parentElement.querySelector("input")
      if (inputToFocus) inputToFocus.focus()
    }
    return
  }

  console.log("[v0] Attempting registration with data:", {
    username: name.value.trim(),
    email: email.value.trim(),
    phone: phone.value.trim(),
  })

  // Call backend API for registration
  try {
    console.log("[v0] Making registration request to backend")
    console.log("[v0] Request URL: http://localhost:5000/api/auth/register")
    console.log("[v0] Request method: POST")
    console.log("[v0] Request headers: Content-Type: application/json")

    const response = await fetch("http://localhost:5000/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: name.value.trim(),
        email: email.value.trim(),
        phone: phone.value.trim(),
        password: password.value,
      }),
    })

    console.log("[v0] Registration response status:", response.status)
    console.log("[v0] Registration response headers:", response.headers)

    if (!response.ok) {
      let errorMessage = "Registration failed"
      try {
        const data = await response.json()
        console.log("[v0] Error response data:", data)
        errorMessage = data.error || errorMessage
      } catch (jsonError) {
        console.error("[v0] Failed to parse error response:", jsonError)
        console.error("[v0] Raw response text:", await response.text().catch(() => "Could not read response"))

        // Provide more specific error messages based on status codes
        if (response.status === 0) {
          errorMessage = "Cannot connect to server. Please check if the backend server is running on port 5000."
        } else if (response.status === 500) {
          errorMessage = "Server error. Please check the database connection and try again."
        } else if (response.status === 409 || response.status === 400) {
          errorMessage = "Email already exists or invalid data. Please check your information."
        } else if (response.status === 404) {
          errorMessage = "Registration endpoint not found. Please check the backend server."
        } else if (response.status === 401) {
          errorMessage = "Unauthorized. Please check your credentials."
        } else {
          errorMessage = `Server returned error ${response.status}. Please try again later.`
        }
      }

      errors[1].textContent = errorMessage
      errors[1].style.visibility = "visible"
      return
    }

    const data = await response.json()
    console.log("[v0] Registration successful:", data)

    // Show success message before redirect
    alert("Registration successful! You can now login with your credentials.")

    // Redirect to login page
    window.location.href = "Login.html"
  } catch (error) {
    console.error("[v0] Registration network error:", error)
    console.error("[v0] Error name:", error.name)
    console.error("[v0] Error message:", error.message)
    console.error("[v0] Error stack:", error.stack)

    let errorMessage = "Network error. Please try again."

    if (error.name === "TypeError" && error.message.includes("fetch")) {
      errorMessage =
        "Cannot connect to server. Please ensure:\n1. Backend server is running on port 5000\n2. No firewall is blocking the connection\n3. The server URL is correct"
    } else if (error.message.includes("CORS")) {
      errorMessage = "Server configuration error. Please check CORS settings."
    } else if (error.message.includes("NetworkError")) {
      errorMessage = "Network connection failed. Please check your internet connection."
    } else if (error.name === "AbortError") {
      errorMessage = "Request timed out. Please try again."
    } else if (error.message.includes("Failed to fetch")) {
      errorMessage = "Cannot connect to server. Please check if the backend server is running on port 5000."
    }

    errors[1].textContent = errorMessage
    errors[1].style.visibility = "visible"
  }
}
