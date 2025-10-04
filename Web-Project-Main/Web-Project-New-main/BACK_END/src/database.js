const { Pool } = require("pg")

const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "universal_market",
  password: process.env.DB_PASSWORD || "1997",
  port: process.env.DB_PORT || 5432,
  max: 20, // maximum number of clients in the pool
  idleTimeoutMillis: 30000, // how long a client is allowed to remain idle
  connectionTimeoutMillis: 2000, // how long to wait when connecting a new client
})

pool.on("connect", (client) => {
  console.log("[DB] New client connected to database")
})

pool.on("error", (err, client) => {
  console.error("[DB] Unexpected error on idle client:", err)
})

pool.query(`SELECT * FROM users`, (err, res) => {
  if (err) {
    console.error("[DB] Database connection failed:", err.message)
    console.error("[DB] Please check your database configuration and ensure PostgreSQL is running")
  } else {
    console.log("[DB] Database connected successfully at:", res.rows)
  }
})

module.exports = pool
