const { promisify } = require('util');
const express = require('express');
const Database = require('../configs/Database');
const router = express.Router();

const db = new Database();
const conn = db.pool;

const queryAsync = promisify(conn.query).bind(conn);
const jwt = require('jsonwebtoken'); // Make sure to install the 'jsonwebtoken' package

// Assuming you have a middleware to check and verify the user's token
// You should replace this with your own authentication middleware
const authenticateUser = (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const decoded = jwt.verify(token, 'your_secret_key'); // Replace 'your_secret_key' with your actual secret key
    req.user_id = decoded.user_id;
    next();
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(401).json({ message: 'Unauthorized' });
  }
};
router.get('/fetch-latest', authenticateUser, async (req, res) => {
  const user_id = req.user_id; // Access the user_id from the authenticated request
  const limit = parseInt(req.query.limit, 10) || 1; // Default limit is 1 if not specified

  try {
    const query = `
      SELECT * FROM (
        SELECT user_id, program_id, competency_id, end_time, score 
        FROM user_exams
        WHERE user_id = ?
        UNION
        SELECT user_id, program_id, competency_id, end_time, score 
        FROM exam_room
      ) AS combined
      ORDER BY end_time DESC
      LIMIT ?;`;
  
    const latestActivity = await queryAsync(query, [user_id, limit]);
    const score = latestActivity.length > 0 ? latestActivity[0].score : null;

    res.json({ latestActivity, score });
  } catch (error) {
    console.error('Error fetching latest activities:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/fetch-exam-room', async (req, res) => {
  try {
    const query = `
    SELECT er.*, u.name as name, u.image as image, r.room_name
    FROM exam_room er
    LEFT JOIN users u ON er.user_id = u.user_id
    LEFT JOIN room r ON er.room_id = r.room_id
    ORDER BY er.end_time DESC;
    `;

    const userExams = await queryAsync(query);

    res.json(userExams);
  } catch (error) {
    console.error('Error fetching exam data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/fetch-rankings', async (req, res) => {
  try {
    const query = `
    SELECT er.*, u.name as name, u.image as image, r.room_name
    FROM exam_room er
    LEFT JOIN users u ON er.user_id = u.user_id
    LEFT JOIN room r ON er.room_id = r.room_id
    WHERE er.score = (
  SELECT MAX(score) FROM exam_room WHERE room_id = er.room_id
)
ORDER BY room_id, score ASC;
    `;

    const userRank = await queryAsync(query);

    res.json(userRank);
  } catch (error) {
    console.error('Error fetching exam data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


module.exports = router;
