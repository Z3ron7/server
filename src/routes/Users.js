const { promisify } = require('util');
const express = require("express")
const Database = require("../configs/Database");
const router = express.Router();

const db = new Database();
const conn = db.pool;
const queryAsync = promisify(conn.query).bind(conn);
app.post("/login", (req, res) => {
  const sql = "SELECT * FROM users WHERE username = ?";
  conn.query(sql, [req.body.username], (err, data) => {
    if (err) {
      return res.json({ Error: "Login error in server" });
    }
    if (data.length > 0) {
      bcrypt.compare(req.body.password.toString(), data[0].password, (err, response) => {
        if (err) {
          return res.json({ Error: "Password compare error" });
        }
        if (response) {
          const name = data[0].name;
          const image = data[0].image;
          let role = data[0].role; // Get the role from the database
          const status = data[0].status; // Get the status from the database
          const user_id = data[0].user_id;

          // Check if the status is "student" or "alumni" and set the role accordingly
          if (status === "student" || status === "alumni") {
            role = "Exam-taker";
          }

          // Here, you can check the verification status from the database
          const isVerified = data[0].isVerified; // Assuming you have an "isVerified" column

          // Include the isVerified status in the token payload
          const token = jwt.sign({ user_id, name, image, role, isVerified }, "jwt-secret-key", {
            expiresIn: "3d",
          });
          res.cookie("token", token, {
          secure: true, // Ensures the cookie is sent only over HTTPS
          sameSite: 'None',
  });
          return res.json({ Status: "Login Successful", token, user_id, name, image, role, isVerified });
        } else {
          return res.json({ Error: "Password error!" });
        }
      });
    } else {
      return res.json({ Error: "Invalid username or password!" });
    }
  });
});
router.get('/users', async (req, res) => {
  try {
    const query = 'SELECT user_id, name, gender, username, status, image FROM users WHERE status IN (?, ?) AND isVerified = ?';
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
    const query = 'SELECT user_id, name, gender, username, status, image, isVerified FROM users WHERE user_id = ?';
    
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

router.put('/users/:user_id', async (req, res) => {
  const userId = req.params.user_id; // Retrieve the userId from the URL parameters
  const updatedUserData = req.body; // Retrieve the updated user data from the request body

  try {
    const query = 'UPDATE users SET name = ?, gender = ?, username = ?, status = ?, image = ?, isVerified = ? WHERE user_id = ?';
    
    const result = await queryAsync(query, [
      updatedUserData.name,
      updatedUserData.gender,
      updatedUserData.username,
      updatedUserData.status,
      updatedUserData.image,
      updatedUserData.isVerified,
      userId
    ]);
    
    if (result.affectedRows === 0) {
      res.status(404).json({ message: 'User not found' });
    } else {
      res.json({ message: 'User data updated successfully' });
    }
  } catch (error) {
    console.error('Error updating user data:', error);
    res.status(500).json({ error: 'An error occurred while updating user data' });
  }
});

  
  router.delete('/users/:user_id', async (req, res) => {
    try {
      const { user_id } = req.params;
      
      const deleteQuery = 'DELETE FROM users WHERE user_id = ?';
      
      // Execute the delete query
      const result = await queryAsync(deleteQuery, [user_id]);
      
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
