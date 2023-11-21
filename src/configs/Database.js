const mysql = require("mysql2");
require("dotenv/config");

const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

class Database {
  constructor() {
    this.pool = mysql.createPool({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 10, // Adjust this based on your needs
      queueLimit: 0
    });
  }

  testConnection() {
    return new Promise((resolve, reject) => {
      this.pool.getConnection((err, connection) => {
        if (err) {
          console.error("Error connecting to the database:", err);
          reject(err);
        } else {
          console.log("Database connected");
          connection.release(); // Release the connection back to the pool
          resolve();
        }
      });
    });
  }
}

module.exports = Database;
