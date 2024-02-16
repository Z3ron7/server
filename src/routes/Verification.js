const { promisify } = require('util');
const express = require("express")
const Database = require("../configs/Database");
const router = express.Router();
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const db = new Database();
const conn = db.pool;
const queryAsync = promisify(conn.query).bind(conn);
const app = express();


const generateOTP = () => {
  return crypto.randomBytes(7).toString('hex').toUpperCase(); // Adjust the length as needed
};

// Server-side route to get a list of unverified users
router.get('/unverified-users', async (req, res) => {
    try {
      // Query the database for unverified users
      const unverifiedUsers = await new Promise((resolve, reject) => {
        const selectQuery = 'SELECT * FROM users WHERE isVerified = 0';
        conn.query(selectQuery, (err, result) => {
          if (err) reject(err);
          resolve(result);
        });
      });
  
      res.json(unverifiedUsers);
    } catch (error) {
      console.error('Error fetching unverified users:', error);
      res.status(500).json({ Error: 'Failed to fetch unverified users' });
    }
  });

 
module.exports = router;
