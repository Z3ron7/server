const mysql = require('mysql2');
require('dotenv/config');

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
      queueLimit: 0,
    });
  }

  async testConnection() {
    try {
      const promisePool = this.pool.promise();
      const [rows, fields] = await promisePool.query('SELECT 1');
      console.log('Database connected');
    } catch (error) {
      console.error('Error connecting to the database:', error);
    }
  }
}

module.exports = Database;
