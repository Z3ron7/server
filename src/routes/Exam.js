const { promisify } = require('util');
const express = require('express');
const Database = require('../configs/Database');
const router = express.Router();

const db = new Database();
const conn = db.pool;

const queryAsync = promisify(conn.query).bind(conn);

// Create a user exam record
// Handle starting an exam for a user
router.post('/user-exams', async (req, res) => {
  try {
    const { user_id, program, competency, duration_minutes } = req.body;

    // Perform lookups to get program_id and competency_id based on names
    const [programResult] = await queryAsync(
      "SELECT program_id FROM program WHERE program_name = ?",
      [program]
    );

    const [competencyResult] = await queryAsync(
      "SELECT competency_id FROM competency WHERE competency_name = ?",
      [competency]
    );

    const program_id = programResult ? programResult.program_id : null;
    const competency_id = competencyResult ? competencyResult.competency_id : null;

    // Insert the user exam record
    const createExamQuery = `
      INSERT INTO user_exams (user_id, program_id, competency_id, duration_minutes, start_time)
      VALUES (?, ?, ?, ?, NOW())
    `;

    const createExamResult = await queryAsync(createExamQuery, [
      user_id,
      program_id,
      competency_id,
      duration_minutes,
    ]);

    const userExamId = createExamResult.insertId;

    res.json({
      user_exam_id: userExamId,
    });
  } catch (error) {
    console.error('Error creating user exam:', error);
    res.status(500).json({ message: 'Failed to create user exam' });
  }
});

router.post('/end-exam', async (req, res) => {
  try {
    const { exam_id, score, total_duration_minutes, endTime } = req.body;

    // Update the exam record in the database, including the score, total_duration_minutes, and endTime
    const updateExamQuery = 'UPDATE user_exams SET end_time = ?, total_duration_minutes = ?, score = ? WHERE exam_id = ?';
    await queryAsync(updateExamQuery, [endTime, total_duration_minutes, score, exam_id]);

    res.status(200).json({ message: 'Exam ended successfully' });
  } catch (error) {
    console.error('Error ending exam:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/admin-exams', async (req, res) => {
  try {
    const {
      exam_name,
      description,
      program,
      competency,
      duration_minutes,
      date_created,
      date_expired
    } = req.body;

    // Perform lookups to get program_id and competency_id based on names
    const [programResult] = await queryAsync(
      "SELECT program_id FROM program WHERE program_name = ?",
      [program]
    );

    const [competencyResult] = await queryAsync(
      "SELECT competency_id FROM competency WHERE competency_name = ?",
      [competency]
    );

    const program_id = programResult ? programResult.program_id : null;
    const competency_id = competencyResult ? competencyResult.competency_id : null;

    // Insert the admin exam record
    const createAdminExamQuery = `
      INSERT INTO admin_exams (exam_name, description, program_id, competency_id, duration_minutes, start_time, date_created, date_expired)
      VALUES (?, ?, ?, ?, ?, NOW(), ?, ?)
    `;

    const createAdminExamResult = await queryAsync(createAdminExamQuery, [
      exam_name,
      description,
      program_id,
      competency_id,
      duration_minutes,
      date_created,
      date_expired
    ]);

    const adminExamId = createAdminExamResult.insertId;

    res.json({
      admin_exam_id: adminExamId,
    });
  } catch (error) {
    console.error('Error creating admin exam:', error);
    res.status(500).json({ message: 'Failed to create admin exam' });
  }
});

router.post('/end-admin-exam', async (req, res) => {
  try {
    const { admin_exam_id, score } = req.body;

    // Get the current timestamp to record the end time
    const endTime = new Date();

    // Update the admin exam record in the database, including the score and end_time
    const updateAdminExamQuery = 'UPDATE admin_exams SET end_time = ?, score = ? WHERE admin_exam_id = ?';
    await queryAsync(updateAdminExamQuery, [endTime, score, admin_exam_id]);

    res.status(200).json({ message: 'Admin exam ended successfully' });
  } catch (error) {
    console.error('Error ending admin exam:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/admin-exams', async (req, res) => {
  try {
    const {
      exam_name,
      description,
      program,
      competency,
      duration_minutes,
      date_created,
      date_expired
    } = req.body;

    // Perform lookups to get program_id and competency_id based on names
    const [programResult] = await queryAsync(
      "SELECT program_id FROM program WHERE program_name = ?",
      [program]
    );

    const [competencyResult] = await queryAsync(
      "SELECT competency_id FROM competency WHERE competency_name = ?",
      [competency]
    );

    const program_id = programResult ? programResult.program_id : null;
    const competency_id = competencyResult ? competencyResult.competency_id : null;

    // Insert the admin exam record
    const createAdminExamQuery = `
      INSERT INTO admin_exams (exam_name, description, program_id, competency_id, duration_minutes, start_time, date_created, date_expired)
      VALUES (?, ?, ?, ?, ?, NOW(), ?, ?)
    `;

    const createAdminExamResult = await queryAsync(createAdminExamQuery, [
      exam_name,
      description,
      program_id,
      competency_id,
      duration_minutes,
      date_created,
      date_expired
    ]);

    const adminExamId = createAdminExamResult.insertId;

    res.json({
      admin_exam_id: adminExamId,
    });
  } catch (error) {
    console.error('Error creating admin exam:', error);
    res.status(500).json({ message: 'Failed to create admin exam' });
  }
});

router.post('/end-admin-exam', async (req, res) => {
  try {
    const { admin_exam_id, score } = req.body;

    // Get the current timestamp to record the end time
    const endTime = new Date();

    // Update the admin exam record in the database, including the score and end_time
    const updateAdminExamQuery = 'UPDATE admin_exams SET end_time = ?, score = ? WHERE admin_exam_id = ?';
    await queryAsync(updateAdminExamQuery, [endTime, score, admin_exam_id]);

    res.status(200).json({ message: 'Admin exam ended successfully' });
  } catch (error) {
    console.error('Error ending admin exam:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
router.get('/fetch-user-exams', async (req, res) => {
  const userId = req.query.userId;
  const limit = parseInt(req.query.limit, 10) || 2; // Parse the limit as an integer

  try {
    // Define a SQL query to fetch user exams with a LIMIT
    const query = `
      SELECT * FROM user_exams
      WHERE user_id = ?
      ORDER BY end_time DESC
      LIMIT ?;
    `;

    // Replace 'userId' with the actual user ID for whom you want to fetch exams

    const userExams = await queryAsync(query, [userId, limit]);
    // Fetch the score for the user
    const scoreQuery = `
      SELECT score FROM user_exams WHERE user_id = ?;
    `;

    const scoreResult = await queryAsync(scoreQuery, [userId]);
    const score = scoreResult[0].score;

    res.json({ userExams, score });
  } catch (error) {
    console.error('Error fetching user exams:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/fetch-user-exam', async (req, res) => {
  const userId = req.query.userId;

  try {
    // Define a SQL query to fetch user exams with a LIMIT
    const query = `
      SELECT * FROM user_exams
      WHERE user_id = ?
      ORDER BY end_time DESC
    `;

    // Replace 'userId' with the actual user ID for whom you want to fetch exams

    const userExams = await queryAsync(query, [userId]);
    // Fetch the score for the user
    const scoreQuery = `
      SELECT score FROM user_exams WHERE user_id = ?;
    `;

    const scoreResult = await queryAsync(scoreQuery, [userId]);
    const score = scoreResult[0].score;

    res.json({ userExams, score });
  } catch (error) {
    console.error('Error fetching user exams:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/delete-user-exam', async (req, res) => {
  const examId = req.body.examId; // Assuming you send the exam_id in the request body

  if (!examId) {
    return res.status(400).json({ message: 'Exam ID is required' });
  }

  try {
    // Define a SQL query to delete a user exam by exam_id
    const deleteQuery = `
      DELETE FROM user_exams
      WHERE exam_id = ?;
    `;

    await queryAsync(deleteQuery, [examId]); // Execute the delete query

    res.json({ message: 'User exam deleted successfully' });
  } catch (error) {
    console.error('Error deleting user exam:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/fetch-admin-exams', async (req, res) => {
  try {
    // Define a SQL query to fetch admin exams
    const query = `
      SELECT * FROM admin_exams;
    `;

    const adminExams = await queryAsync(query);

    res.json({ adminExams });
  } catch (error) {
    console.error('Error fetching admin exams:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


router.put('/user_exams/:exam_id', async (req, res) => {
  try {
    const { exam_id } = req.params;
    const { score, total_duration_minutes } = req.body;

    // Update the score and total_duration_minutes for the specified user exam
    const updateExamQuery = `
      UPDATE user_exams
      SET score = ?, total_duration_minutes = ?
      WHERE exam_id = ?
    `;

    await queryAsync(updateExamQuery, [score, total_duration_minutes, exam_id]);

    res.json({ message: 'User exam updated successfully' });
  } catch (error) {
    console.error('Error updating user exam:', error);
    res.status(500).json({ error: 'Failed to update user exam' });
  }
});

// Delete a user exam
router.delete('/user-exams/:user_exam_id', async (req, res) => {
  try {
    const { user_exam_id } = req.params;

    const deleteExamQuery = `
      DELETE FROM exam WHERE user_exam_id = ?
    `;

    await queryAsync(deleteExamQuery, [user_exam_id]);

    res.json({ message: 'User exam deleted successfully' });
  } catch (error) {
    console.error('Error deleting user exam:', error);
    res.status(500).json({ message: 'Failed to delete user exam' });
  }
});


module.exports = router;
