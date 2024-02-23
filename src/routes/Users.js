const { promisify } = require('util');
const express = require("express")
const Database = require("../configs/Database");
const router = express.Router();
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const db = new Database();
const conn = db.pool;
const queryAsync = promisify(conn.query).bind(conn);
const path = require('path');

const storage = multer.diskStorage({
  filename: function (req, file, callback) {
    callback(null, file.originalname); // Use the original filename as the stored filename
  },
});

const upload = multer({ storage: storage });

router.get('/users', async (req, res) => {
  try {
    const query = 'SELECT user_id, name, gender, username, status, image, school_id FROM users WHERE status IN (?, ?) AND isVerified = ?';
    const statusFilter = ['student', 'alumni'];
    const isVerifiedValue = 1; // 1 for true

    const users = await queryAsync(query, [...statusFilter, isVerifiedValue]);
    res.json(users);
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ error: 'An error occurred while fetching data' });
  }
});

router.get('/users/:user_id', async (req, res) => {
  const userId = req.params.user_id; // Retrieve the userId from the URL parameters

  try {
    const query = 'SELECT user_id, name, gender, username, status, image, school_id, isVerified FROM users WHERE user_id = ?';
    
    const user = await queryAsync(query, [userId]);
    
    if (user.length === 0) {
      res.status(404).json({ message: 'User not found' });
    } else {
      res.json(user[0]);
    }
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({ error: 'An error occurred while fetching data' });
  }
});

router.put('/users/:user_id', upload.single('image'), async (req, res) => {
  const userId = req.params.user_id; // Retrieve the userId from the URL parameters
  const { name, username } = req.body; // Extract updated fields from the request body
  let image = ''; // Initialize imagePath as null

  try {
    // Check if at least one of the fields is provided for updating
    if (!name && !username) {
      return res.status(400).json({ message: 'No fields provided for update' });
    }

    let updateFields = [];
    let updateValues = [];
// Image upload to Cloudinary
if (req.file) {
  const result = await cloudinary.uploader.upload(req.file.path, {
    width: 150,
    height: 100,
    crop: 'fill',
  });

  imagePath = result.url; // Save the Cloudinary URL to the imagePath
}
    // Build the SQL query dynamically based on the provided fields
    if (name) {
      updateFields.push('name = ?');
      updateValues.push(name);
    }

    if (image) {
      updateFields.push('image = ?');
      updateValues.push(image); // Save the image path
    }

    if (username) {
      updateFields.push('username = ?');
      updateValues.push(username);
    }
    // Construct the final SQL query
    const query = `UPDATE users SET ${updateFields.join(', ')} WHERE user_id = ?`;

    // Add the userId to the updateValues array
    updateValues.push(userId);

    // Execute the update query
    await queryAsync(query, updateValues);

    // Fetch and return the updated user data
    const updatedUser = await queryAsync('SELECT user_id, name, gender, username, status, image, school_id, isVerified FROM users WHERE user_id = ?', [userId]);

    if (updatedUser.length === 0) {
      res.status(404).json({ message: 'User not found' });
    } else {
      res.json(updatedUser[0]);
    }
  } catch (error) {
    console.error('Error updating user data:', error);
    res.status(500).json({ error: 'An error occurred while updating data' });
  }
});
  
router.delete('/users/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;

    // Delete related records in the user_exams table
    const deleteExamsQuery = 'DELETE FROM user_exams WHERE user_id = ?';
    await queryAsync(deleteExamsQuery, [user_id]);

    // Delete the user
    const deleteUserQuery = 'DELETE FROM users WHERE user_id = ?';
    const result = await queryAsync(deleteUserQuery, [user_id]);

    if (result.affectedRows === 1) {
      // Row deleted successfully
      res.json({ message: 'User deleted successfully' });
    } else {
      // No rows were affected, meaning the user wasn't found
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'An error occurred while deleting the user' });
  }
});

  router.get('/user-stats', async (req, res) => {
    try {
      const query = `
        SELECT status, isVerified, COUNT(*) AS count 
        FROM users 
        WHERE (isVerified = ? OR isVerified = ?)
        AND status IN (?, ?) 
        GROUP BY status, isVerified`;
  
      const isVerifiedTrue = 1; // 1 for true
      const isVerifiedFalse = 0; // 0 for false
      const statusFilter = ['student', 'alumni'];
  
      const results = await queryAsync(query, [isVerifiedTrue, isVerifiedFalse, ...statusFilter]);
  
      const userStats = {
        totalStudentsVerified: 0,
        totalAlumniVerified: 0,
        totalStudentsNotVerified: 0,
        totalAlumniNotVerified: 0,
      };
  
      results.forEach((row) => {
        if (row.status === 'student') {
          if (row.isVerified === isVerifiedTrue) {
            userStats.totalStudentsVerified = row.count;
          } else {
            userStats.totalStudentsNotVerified = row.count;
          }
        } else if (row.status === 'alumni') {
          if (row.isVerified === isVerifiedTrue) {
            userStats.totalAlumniVerified = row.count;
          } else {
            userStats.totalAlumniNotVerified = row.count;
          }
        }
      });
  
      res.json(userStats);
    } catch (error) {
      console.error('Error fetching user statistics:', error);
      res.status(500).json({ error: 'An error occurred while fetching statistics' });
    }
  });
  
  router.get('/fetch-latest/:user_id', async (req, res) => {
    const user_id = req.params.user_id;
  
    try {
      // Define a SQL query to fetch the latest activities from both tables
      const query = `
        SELECT * FROM (SELECT user_id, program_id, competency_id, 
                      start_time, end_time, score 
                      FROM user_exams
                      WHERE user_id = ?
                      UNION
                      SELECT user_id, program_id, competency_id, 
                      start_time, end_time, score 
                      FROM exam_room) AS combined
        ORDER BY end_time DESC;
      `;
  
      const latestActivities = await queryAsync(query, [user_id]);
  
      res.json({ latestActivities });
    } catch (error) {
      console.error('Error fetching latest activities:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  
  module.exports = router;