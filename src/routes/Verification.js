const { promisify } = require('util');
const express = require("express")
const Database = require("../configs/Database");
const router = express.Router();
const { sendEmail } = require("../utils/sendEmail");
const crypto = require('crypto');

const db = new Database();
const conn = db.pool;
const queryAsync = promisify(conn.query).bind(conn);

const generateOTP = () => {
  return crypto.randomBytes(7).toString('hex').toUpperCase(); // Adjust the length as needed
};

// Server-side route to get a list of unverified users
router.get('/unverified-users', async (req, res) => {
    try {
      // Query the database for unverified users
      const unverifiedUsers = await new Promise((resolve, reject) => {
        const selectQuery = 'SELECT * FROM users WHERE isVerified = 0 ORDER BY created_at DESC';
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
      const updateQuery = 'UPDATE users SET isVerified = 0 WHERE user_id = ?';
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
        from: 'smartexamhub@gmail.com', // Replace with your email
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
  
  router.post('/send-verification/:userId', async (req, res) => {
    const userId = req.params.userId;
  
    try {
      // Generate OTP
      const otp = generateOTP();
  
      // Save the OTP in the database
      const saveOtpQuery = 'UPDATE users SET otp = ? WHERE user_id = ?';
      await new Promise((resolve, reject) => {
        conn.query(saveOtpQuery, [otp, userId], (err) => {
          if (err) reject(err);
          resolve();
        });
      });
  
      // Fetch the user's email address from the database
      const selectEmailQuery = 'SELECT username FROM users WHERE user_id = ?';
      const [userData] = await queryAsync(selectEmailQuery, [userId]);
      const userEmail = userData.username;
  
      // Send an email to the user with the OTP and verification link
      const verificationLink = `https://smartexamhub.vercel.app/verify/${userId}/${otp}`; // Replace with your domain
      const mailOptions = {
        from: 'smartexamhub@gmail.com', // Replace with your email
        to: userEmail,
        subject: 'Account Verification',
        text: `Click the following link to verify your account: ${verificationLink}`,
        html: `Click the following link to verify your account: <a href="${verificationLink}">${verificationLink}</a></p>`,
      };
  
      // Call SendEmail function to send the email
      await sendEmail(mailOptions);
  
      // Send a response indicating success
      res.json({ Status: 'Verification email sent' });
    } catch (error) {
      console.error('Error sending verification email:', error);
      res.status(500).json({ Error: 'Failed to send verification email' });
    }
  });
  
  // Route to verify the user using the provided OTP
  router.post('/verify/:userId/:otp', async (req, res) => {
    const userId = req.params.userId;
    const enteredOTP = req.params.otp;
  
    try {
      // Fetch the stored OTP from the database
      const selectOtpQuery = 'SELECT otp FROM users WHERE user_id = ?';
      const [userData] = await queryAsync(selectOtpQuery, [userId]);
  
      // Check if userData is defined and has an otp property
      if (userData && userData.otp) {
        const storedOTP = userData.otp;
  
        // Check if the entered OTP matches the stored OTP
        if (enteredOTP === storedOTP) {
          // Update the user's verification status in the database (e.g., set isVerified to 1)
          const updateQuery = 'UPDATE users SET isVerified = 1 WHERE user_id = ?';
          await new Promise((resolve, reject) => {
            conn.query(updateQuery, [userId], (err) => {
              if (err) reject(err);
              resolve();
            });
          });
  
          // Send a response indicating success
          res.json({ Status: 'User verified' });
        } else {
          // Send a response indicating failure
          res.status(400).json({ Error: 'Invalid OTP' });
        }
      } else {
        // Send a response indicating failure due to missing OTP in userData
        res.status(400).json({ Error: 'Missing OTP for the user' });
      }
    } catch (error) {
      console.error('Error verifying user:', error);
      res.status(500).json({ Error: 'Failed to verify user' });
    }
  });
  
  // Add a new route for updating isVerified status
router.post('/update-is-verified/:userId', async (req, res) => {
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

    // Send a response indicating success
    res.json({ Status: 'isVerified updated to 1' });
  } catch (error) {
    console.error('Error updating isVerified:', error);
    res.status(500).json({ Error: 'Failed to update isVerified' });
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
