const { promisify } = require('util');
const express = require("express")
const Database = require("../configs/Database");
const router = express.Router();
const nodemailer = require('nodemailer');

const db = new Database();
const conn = db.pool;
const queryAsync = promisify(conn.query).bind(conn);

const transporter = nodemailer.createTransport({
  service: 'Gmail', // Replace with your email service provider
  auth: {
    user: 'zoren.panilagao1@gmail.com', // Replace with your email
    pass: 'yvij frwd swws udms', // Replace with your email password
  },
});
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

  router.post('/accept-user/:userId', async (req, res) => {
    const userId = req.params.userId;
  
    try {
      // Update the user's verification status in the database (e.g., set isVerified to 1)
      const updateQuery = 'UPDATE users SET isVerified = 1 WHERE user_id = ?';
      await new Promise((resolve, reject) => {
        conn.query(updateQuery, [userId], (err) => {
          if (err) reject(err);
          resolve();
        });
      });
  
      // Fetch the user's email address from the database
      const selectEmailQuery = 'SELECT username FROM users WHERE user_id = ?';
      const [userData] = await queryAsync(selectEmailQuery, [userId]);
      const userEmail = userData.username;
  
      // Send an email to the user
      transporter.sendMail({
        from: 'zoren.panilagao1@gmail.com', // Replace with your email
        to: userEmail, // Use the user's email
        subject: 'Verification Complete',
        text: 'Your account has been verified and is now active.',
        // You can use HTML to send a more informative message
        html: '<p>Your account has been verified and is now active. You can now log in.</p>',
      });
  
      // Send a response indicating success
      res.json({ Status: 'User accepted' });
    } catch (error) {
      console.error('Error accepting user:', error);
      res.status(500).json({ Error: 'Failed to accept user' });
    }
  });
  

  router.post('/reject-user/:userId', async (req, res) => {
    const userId = req.params.userId;
  
    try {
      // Update the user's verification status in the database (e.g., set isVerified to 2 for rejected)
      const updateQuery = 'UPDATE users SET isVerified = 2 WHERE user_id = ?';
      await new Promise((resolve, reject) => {
        conn.query(updateQuery, [userId], (err) => {
          if (err) reject(err);
          resolve();
        });
      });
  
      // Send a response indicating success
      res.json({ Status: 'User rejected' });
    } catch (error) {
      console.error('Error rejecting user:', error);
      res.status(500).json({ Error: 'Failed to reject user' });
    }
  });
module.exports = router;
