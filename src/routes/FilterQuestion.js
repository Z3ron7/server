const { promisify } = require('util');
const express = require("express");
const SSE = require('sse-express'); 
const Database = require("../configs/Database");
const router = express.Router();

const db = new Database();
const conn = db.pool;

const queryAsync = promisify(conn.query).bind(conn);

router.get("/filterQuestions", async (req, res) => {
  try {
    const { program, competency, search } = req.query;

    // Build a SQL query to filter questions by program, competency, and search text, including choices
    let sqlQuery = `
      SELECT q.question_id, q.questionText, c.choiceText, c.isCorrect
      FROM question AS q
      LEFT JOIN choices AS c ON q.question_id = c.question_id
      INNER JOIN program AS p ON q.program_id = p.program_id
      INNER JOIN competency AS comp ON q.competency_id = comp.competency_id
    `;
    
    const queryParams = [];

    if (program) {
      sqlQuery += ' WHERE p.program_name LIKE ?';
      queryParams.push(`%${program}%`);
    }

    if (competency && competency !== 'All Competency') {
      if (queryParams.length > 0) {
        sqlQuery += ' AND';
      } else {
        sqlQuery += ' WHERE';
      }
      sqlQuery += ' comp.competency_name LIKE ?';
      queryParams.push(`%${competency}%`);
    }

    if (search) {
      if (queryParams.length > 0) {
        sqlQuery += ' AND';
      } else {
        sqlQuery += ' WHERE';
      }
      sqlQuery += ' (q.questionText LIKE ? OR c.choiceText LIKE ?)';
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    const result = await queryAsync(sqlQuery, queryParams);

    res.json(result);
  } catch (error) {
    console.error('Error filtering questions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});




module.exports = router;
