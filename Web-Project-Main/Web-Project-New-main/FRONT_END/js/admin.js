const API_URL = "http://localhost:5000/api"
let allProducts = []
let currentEditId = null

// Open sell page for posting new items
function openSellPage() {
  window.location.href = "Sell.html"
}

// Handle logout
function handleLogout() {
  if (confirm("Are you sure you want to logout?")) {
    // Clear authentication data
    localStorage.removeItem("authToken")
    localStorage.removeItem("user")
    localStorage.removeItem("users")
    
    // Show logout message
    showAlert("Logged out successfully!", "success")
    
    // Redirect to login page after a short delay
    setTimeout(() => {
      window.location.href = "Login.html"
    }, 1500)
  }
}

// Check authentication on page load
document.addEventListener("DOMContentLoaded", () => {
  console.log("[ADMIN] Page loaded - checking localStorage")
  console.log("[ADMIN] authToken:", localStorage.getItem("authToken"))
  console.log("[ADMIN] user:", localStorage.getItem("user"))
  console.log("[ADMIN] All localStorage keys:", Object.keys(localStorage))
  
  loadCategories()
  loadProducts()
})

// Show alert message
function showAlert(message, type = "info") {
  const alertContainer = document.getElementById("alertContainer")
  const alert = document.createElement("div")
  alert.className = `alert alert-${type}`
  alert.textContent = message
  alertContainer.appendChild(alert)

  setTimeout(() => {
    alert.remove()
  }, 5000)
}

// Load categories for filters
async function loadCategories() {
  try {
    const response = await fetch(`${API_URL}/categories`)
    const data = await response.json()

    if (data.success) {
      const categoryFilter = document.getElementById("categoryFilter")
      const editCategory = document.getElementById("editCategory")

      data.categories.forEach((category) => {
        const option1 = document.createElement("option")
        option1.value = category
        option1.textContent = category
        categoryFilter.appendChild(option1)

        const option2 = document.createElement("option")
        option2.value = category
        option2.textContent = category
        editCategory.appendChild(option2)
      })
    }
  } catch (error) {
    console.error("[v0] Error loading categories:", error)
  }
}

// Load all products
async function loadProducts() {
  try {
    const token = localStorage.getItem("authToken")
    const endpoint = token ? `${API_URL}/admin/products` : `${API_URL}/products`
    const headers = token
      ? { Authorization: `Bearer ${token}` }
      : {}

    console.log("[ADMIN] Loading products from endpoint:", endpoint)
    console.log("[ADMIN] Using headers:", headers)

    const response = await fetch(endpoint, { headers })
    console.log("[ADMIN] Load products response status:", response.status)

    const data = await response.json()
    console.log("[ADMIN] Load products response data:", data)

    if (data.success) {
      allProducts = data.products
      console.log("[ADMIN] Loaded products count:", allProducts.length)
      console.log("[ADMIN] Products with is_active status:")
      allProducts.forEach(product => {
        console.log(`[ADMIN] - Product ${product.id} (${product.name}): is_active = ${product.is_active}`)
      })
      displayProducts(allProducts)
      updateProductCount(allProducts.length)
    } else {
      showAlert(data.error || "Failed to load products", "error")
    }
  } catch (error) {
    console.error("[ADMIN] Error loading products:", error)
    showAlert("Error loading products. Please try again.", "error")
    document.getElementById("tableContainer").innerHTML = '<div class="no-products">Error loading products</div>'
  }
}

// Search products
async function searchProducts() {
  const searchTerm = document.getElementById("searchInput").value.trim()
  const category = document.getElementById("categoryFilter").value

  try {
    const token = localStorage.getItem("authToken")
    const params = new URLSearchParams()

    if (searchTerm) params.append("search", searchTerm)
    if (category) params.append("category", category)

    const endpoint = token ? `${API_URL}/admin/products` : `${API_URL}/products`
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    const response = await fetch(`${endpoint}?${params.toString()}`, { headers })

    const data = await response.json()

    if (data.success) {
      allProducts = data.products
      displayProducts(allProducts)
      updateProductCount(allProducts.length)
      showAlert(`Found ${data.products.length} product(s)`, "success")
    } else {
      showAlert(data.error || "Search failed", "error")
    }
  } catch (error) {
    console.error("[v0] Error searching products:", error)
    showAlert("Error searching products. Please try again.", "error")
  }
}

// Reset search
function resetSearch() {
  document.getElementById("searchInput").value = ""
  document.getElementById("categoryFilter").value = ""
  loadProducts()
}

// Display products in table
function displayProducts(products) {
  const tableContainer = document.getElementById("tableContainer")

  if (products.length === 0) {
    tableContainer.innerHTML = '<div class="no-products">No products found</div>'
    return
  }

  const table = `
    <table class="products-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Image</th>
          <th>Name</th>
          <th>Category</th>
          <th>Price</th>
          <th>Stock</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${products
          .map(
            (product) => `
          <tr>
            <td>#${product.id}</td>
            <td>
              <img src="${product.image_url || "/placeholder.svg?height=60&width=60"}" 
                   alt="${product.name}" 
                   class="product-image"
                   onerror="this.src='/placeholder.svg?height=60&width=60'">
            </td>
            <td><strong>${product.name}</strong></td>
            <td>${product.category}</td>
            <td>${Number.parseFloat(product.price).toFixed(2)} ETB</td>
            <td>${product.stock_quantity}</td>
            <td>
              <span class="status-badge ${product.is_active ? "status-active" : "status-inactive"}">
                ${product.is_active ? "Active" : "Inactive"}
              </span>
            </td>
            <td>
              <div class="action-buttons">
                <button class="btn btn-warning btn-sm" onclick="editProduct(${product.id})">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="deleteProduct(${product.id})">Delete</button>
              </div>
            </td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>
  `

  tableContainer.innerHTML = table
}

// Update product count
function updateProductCount(count) {
  document.getElementById("productCount").textContent = `Total: ${count} product(s)`
}

// Edit product
function editProduct(productId) {
  const token = localStorage.getItem("authToken")
  console.log("[ADMIN] Edit product - token check:", token ? "Token found" : "No token")
  console.log("[ADMIN] All localStorage keys:", Object.keys(localStorage))

  const product = allProducts.find((p) => p.id === productId)
  if (!product) {
    showAlert("Product not found", "error")
    return
  }

  currentEditId = productId

  // Populate form
  document.getElementById("editProductId").value = product.id
  document.getElementById("editName").value = product.name
  document.getElementById("editCategory").value = product.category
  document.getElementById("editPrice").value = product.price
  document.getElementById("editStock").value = product.stock_quantity
  document.getElementById("editImageUrl").value = product.image_url || ""
  document.getElementById("editDescription").value = product.description || ""
  document.getElementById("editStatus").value = product.is_active.toString()

  // Show form
  document.getElementById("editFormSection").classList.add("active")

  // Scroll to form
  document.getElementById("editFormSection").scrollIntoView({ behavior: "smooth" })
}

// Cancel edit
function cancelEdit() {
  document.getElementById("editFormSection").classList.remove("active")
  document.getElementById("editForm").reset()
  currentEditId = null
}

// Handle form submission
document.getElementById("editForm").addEventListener("submit", async (e) => {
  e.preventDefault()

  const productId = document.getElementById("editProductId").value
  const token = localStorage.getItem("authToken")

  const productData = {
    name: document.getElementById("editName").value,
    category: document.getElementById("editCategory").value,
    price: Number.parseFloat(document.getElementById("editPrice").value),
    stock_quantity: Number.parseInt(document.getElementById("editStock").value),
    image_url: document.getElementById("editImageUrl").value,
    description: document.getElementById("editDescription").value,
    is_active: document.getElementById("editStatus").value === "true",
  }

  try {
    const headers = {
      "Content-Type": "application/json",
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    const response = await fetch(`${API_URL}/products/${productId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(productData),
    })

    const data = await response.json()

    if (data.success) {
      showAlert("Product updated successfully!", "success")
      cancelEdit()
      loadProducts()
    } else {
      showAlert(data.error || "Failed to update product", "error")
    }
  } catch (error) {
    console.error("[v0] Error updating product:", error)
    showAlert("Error updating product. Please try again.", "error")
  }
})

// Delete product
async function deleteProduct(productId) {
  const token = localStorage.getItem("authToken")
  console.log("[ADMIN] Delete product called for ID:", productId)
  console.log("[ADMIN] Auth token:", token ? "Found" : "Not found")

  if (!confirm("Are you sure you want to delete this product? This will mark it as inactive.")) {
    console.log("[ADMIN] Delete cancelled by user")
    return
  }

  try {
    const headers = {}
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    console.log("[ADMIN] Sending DELETE request to:", `${API_URL}/products/${productId}`)
    console.log("[ADMIN] Request headers:", headers)

    const response = await fetch(`${API_URL}/products/${productId}`, {
      method: "DELETE",
      headers,
    })

    console.log("[ADMIN] Delete response status:", response.status)
    console.log("[ADMIN] Delete response ok:", response.ok)

    const data = await response.json()
    console.log("[ADMIN] Delete response data:", data)

    if (data.success) {
      showAlert("Product deleted successfully! (Marked as inactive)", "success")
      console.log("[ADMIN] Product deleted successfully, reloading products...")
      loadProducts()
    } else {
      showAlert(data.error || "Failed to delete product", "error")
    }
  } catch (error) {
    console.error("[ADMIN] Error deleting product:", error)
    showAlert("Error deleting product. Please try again.", "error")
  }
}
