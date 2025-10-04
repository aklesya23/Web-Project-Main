# Universal Market Backend Setup Instructions

## Prerequisites
- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn package manager

## Installation

### 1. Install Dependencies
\`\`\`bash
cd BACK_END
npm install express cors helmet morgan dotenv
npm install pg bcryptjs jsonwebtoken
npm install multer cloudinary express-validator
npm install express-rate-limit
npm install -D nodemon concurrently
\`\`\`

### 2. Database Setup

#### Create Database
\`\`\`sql
CREATE DATABASE universal_market;
\`\`\`

#### Run Database Scripts
Execute the SQL scripts in order:
\`\`\`bash
# Connect to your PostgreSQL database and run:
psql -U postgres -d universal_market -f ../scripts/01-create-database.sql
psql -U postgres -d universal_market -f ../scripts/02-seed-data.sql
\`\`\`

#### Create Environment File
Create a `.env` file in the BACK_END folder:
\`\`\`env
DB_USER=postgres
DB_HOST=localhost
DB_NAME=universal_market
DB_PASSWORD=your_password_here
DB_PORT=5432
JWT_SECRET=your-secret-key-change-in-production
PORT=5000
NODE_ENV=development
\`\`\`

### 3. Running the Server

#### Development Mode
\`\`\`bash
npm run dev
# or
node index.js
\`\`\`

The server will start on port 5000 (or the port specified in your .env file).

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile (requires authentication)

### Products
- `GET /api/products` - Get all products (with optional filtering)
- `GET /api/products/:id` - Get single product by ID
- `POST /api/products` - Add new product (requires authentication)
- `GET /api/categories` - Get all product categories

### Query Parameters for Products
- `categories` - Filter by categories (comma-separated)
- `minPrice` - Minimum price filter
- `maxPrice` - Maximum price filter
- `search` - Search in product name and description

## Frontend Setup

### 1. Serve Frontend Files
You can serve the frontend files using any static file server:

#### Using Python (if installed)
\`\`\`bash
cd FRONT_END
python -m http.server 8000
# or for Python 2
python -m SimpleHTTPServer 8000
\`\`\`

#### Using Node.js serve package
\`\`\`bash
npm install -g serve
cd FRONT_END
serve -p 8000
\`\`\`

#### Using Live Server (VS Code Extension)
Install the Live Server extension in VS Code and right-click on `index.html` to open with Live Server.

### 2. Access the Application
- Frontend: http://localhost:8000
- Backend API: http://localhost:5000

## Features Implemented

### Backend Features
- ✅ User authentication (register/login)
- ✅ JWT token-based authorization
- ✅ Product CRUD operations
- ✅ Product filtering and search
- ✅ Category management
- ✅ Database connection with PostgreSQL
- ✅ CORS configuration for frontend integration
- ✅ Error handling and validation

### Frontend Features
- ✅ User registration and login
- ✅ Product marketplace with filtering
- ✅ Search functionality (moved above categories)
- ✅ Shopping cart functionality
- ✅ Product listing (sell page)
- ✅ Responsive design
- ✅ Authentication state management
- ✅ Dynamic product display
- ✅ Cart persistence with localStorage

## Database Schema

### Users Table
- id (Primary Key)
- full_name
- email (Unique)
- phone
- password_hash
- created_at
- updated_at

### Products Table
- id (Primary Key)
- seller_id (Foreign Key to users)
- name
- description
- price
- category
- image_url
- is_active
- stock_quantity
- created_at

### Cart Items Table
- id (Primary Key)
- user_id (Foreign Key to users)
- product_id (Foreign Key to products)
- quantity
- added_at

## Troubleshooting

### Common Issues

1. **Registration/Login Fetch Errors**
   - **Error**: "Cannot connect to server" or "Network error"
   - **Solutions**:
     - Ensure backend server is running: `node BACK_END/index.js`
     - Check if port 5000 is available (not used by another process)
     - Verify the backend URL in frontend code matches `http://localhost:5000`
     - Check browser console for detailed error messages
     - Test backend directly with curl:
       \`\`\`bash
       curl -X GET http://localhost:5000/api/health
       curl -X POST http://localhost:5000/api/auth/register \
         -H "Content-Type: application/json" \
         -d '{"username":"test","email":"test@example.com","phone":"1234567890","password":"password123"}'
       \`\`\`

2. **Database Connection Error**
   - **Error**: "Database connection failed" or foreign key constraint violations
   - **Solutions**:
     - Ensure PostgreSQL is running: `sudo service postgresql start` (Linux) or check Services (Windows)
     - Check database credentials in .env file
     - Verify database exists: `psql -U postgres -l`
     - Run database scripts in correct order:
       \`\`\`bash
       psql -U postgres -d universal_market -f scripts/01-create-database.sql
       psql -U postgres -d universal_market -f scripts/02-seed-data.sql
       \`\`\`
     - Check PostgreSQL logs for detailed error messages

3. **CORS Errors**
   - **Error**: "Access to fetch blocked by CORS policy"
   - **Solutions**:
     - Backend is configured to allow all origins in development
     - Ensure backend is running on port 5000
     - Clear browser cache and cookies
     - Try accessing frontend via `http://localhost:8000` instead of `file://`

4. **Frontend Not Loading Products**
   - **Error**: Empty marketplace or "Error loading products"
   - **Solutions**:
     - Check if backend server is running
     - Open browser console (F12) for error messages
     - Verify API endpoints are accessible: visit `http://localhost:5000/api/products`
     - Check network tab in browser dev tools for failed requests

5. **Authentication Issues**
   - **Error**: "Invalid token" or login not persisting
   - **Solutions**:
     - Clear localStorage: `localStorage.clear()` in browser console
     - Check JWT_SECRET in .env file (should be consistent)
     - Verify token is being stored: check Application tab in browser dev tools
     - Check if token has expired (24-hour expiry by default)

### Debugging Steps

1. **Check Backend Status**:
   \`\`\`bash
   # Test if backend is running
   curl http://localhost:5000/api/health
   
   # Should return: {"status":"healthy","timestamp":"...","database":"connected"}
   \`\`\`

2. **Test Database Connection**:
   \`\`\`bash
   # Connect to database directly
   psql -U postgres -d universal_market -c "SELECT COUNT(*) FROM users;"
   psql -U postgres -d universal_market -c "SELECT COUNT(*) FROM products;"
   \`\`\`

3. **Check Frontend Console**:
   - Open browser Developer Tools (F12)
   - Go to Console tab
   - Look for `[v0]` prefixed messages for detailed debugging info
   - Check Network tab for failed API requests

4. **Verify Environment Variables**:
   \`\`\`bash
   # In BACK_END directory, check if .env file exists and has correct values
   cat .env
   \`\`\`

### Development Tips
- Use browser developer tools to monitor network requests
- Check backend console for detailed error logs with timestamps
- Ensure both frontend and backend servers are running simultaneously
- The enhanced error handling now provides specific error messages for different failure scenarios
- All API requests are logged with detailed information for debugging

## Next Steps
- Implement image upload functionality
- Add order management system
- Implement payment processing
- Add user profile management
- Implement real-time notifications
- Add product reviews and ratings