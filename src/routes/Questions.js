// questions.js
const { promisify } = require('util');
const express = require("express")
const Database = require("../configs/Database");
const router = express.Router();

const db = new Database();
const conn = db.pool;

const queryAsync = promisify(conn.query).bind(conn);

router.post("/create", async (req, res) => {
  try {
    const { question_text, program, competency, choices } = req.body;

    // Get program_id and competency_id based on predefined values
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

    // Insert the question into the database
    const result = await queryAsync(
      "INSERT INTO question (questionText, program_id, competency_id) VALUES (?, ?, ?)",
      [question_text, program_id, competency_id]
    );

    const question_id = result.insertId;

    if (choices && choices.length > 0) {
      for (const choice of choices) {
        const { choiceText, isCorrect } = choice;

        await queryAsync(
          'INSERT INTO choices (question_id, choiceText, isCorrect) VALUES (?, ?, ?)',
          [question_id, choiceText, isCorrect]
        );
      }
    }

    res.json({ message: "Question and choices created successfully", question_id });
  } catch (error) {
    console.error("Error creating question and choices:", error);
    res.status(500).json({ error: "Failed to create question and choices" });
  }
});

router.get('/fetch', async (req, res) => {
  const db = new Database();
  const conn = db.pool;
  const { program, competency, search } = req.query;

  // Define the base query to fetch questions and choices, including competency_id
  let query = `
    SELECT q.question_id, q.competency_id, q.questionText, c.choiceText, c.isCorrect
    FROM question AS q
    LEFT JOIN choices AS c ON q.question_id = c.question_id
  `;

  // Add filters for program, competency, and search if provided
  const queryParams = [];
  if (program || competency || search) {
    query += ' WHERE';

    if (program) {
      query += ' q.program_id IN (SELECT program_id FROM program WHERE program_name LIKE ?)';
      queryParams.push(`%${program}%`);
    }

    if (competency) {
      if (program) {
        query += ' AND';
      }
      query += ' q.competency_id IN (SELECT competency_id FROM competency WHERE competency_name LIKE ?)';
      queryParams.push(`%${competency}%`);
    }

    if (search) {
      if (program || competency) {
        query += ' AND';
      }
      query += ' (q.questionText LIKE ? OR c.choiceText LIKE ?)'; // Search in questionText and choiceText
      queryParams.push(`%${search}%`);
      queryParams.push(`%${search}%`);
    }
  }
  
  try {
    await conn.connect();

    conn.query(query, queryParams, (err, result) => {
      if (err) throw err;

      // Create an array to hold questions
      const questions = [];

      result.forEach((row) => {
        const questionId = row.question_id;
        const competencyId = row.competency_id;

        // Find the question in the array or create a new one
        let question = questions.find(q => q.question_id === questionId);
        if (!question) {
          question = {
            question_id: questionId,
            competency_id: competencyId,
            questionText: row.questionText,
            choices: [],
          };
          questions.push(question);
        }

        // Add choices to the respective question
        if (row.choiceText !== null) {
          question.choices.push({
            choiceText: row.choiceText,
            isCorrect: row.isCorrect,
          });
        }
      });

      res.json(questions);
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    conn.end();
  }
});


router.put("/update/:questionId", async (req, res) => {
  const { questionId } = req.params;
  const { question_text, program, competency, choices } = req.body;

  try {
    // Get program_id and competency_id based on predefined values
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

    // Update the question in the database
    await queryAsync(
      "UPDATE question SET questionText = ?, program_id = ?, competency_id = ? WHERE question_id = ?",
      [question_text, program_id, competency_id, questionId]
    );

    // Remove existing choices
    await queryAsync(
      "DELETE FROM choices WHERE question_id = ?",
      [questionId]
    );

    // Insert the updated choices
    if (choices && choices.length > 0) {
      for (const choice of choices) {
        const { choiceText, isCorrect } = choice;

        await queryAsync(
          'INSERT INTO choices (question_id, choiceText, isCorrect) VALUES (?, ?, ?)',
          [questionId, choiceText, isCorrect]
        );
      }
    }

    res.json({ message: "Question and choices updated successfully", question_id: questionId });
  } catch (error) {
    console.error("Error updating question and choices:", error);
    res.status(500).json({ error: "Failed to update question and choices" });
  }
});

router.delete("/delete/:questionId", async (req, res) => {
  const { questionId } = req.params;

  try {
    // Delete the question and associated choices
    await queryAsync(
      "DELETE FROM question WHERE question_id = ?;",
      [questionId]
    );

    // Respond with a success message
    res.json({ message: "Question and associated choices deleted successfully", question_id: questionId });
  } catch (error) {
    console.error("Error deleting question and associated choices:", error);
    res.status(500).json({ error: "Failed to delete question and associated choices" });
  }
});


router.get('/refresh', async (req, res) => {
  const db = new Database();
  const conn = db.pool;
  const { program, competency } = req.query;

  // Define the base query to fetch questions and choices, including competency_id
  let query = `
    SELECT q.question_id, q.competency_id, q.questionText, c.choiceText, c.isCorrect
    FROM question AS q
    LEFT JOIN choices AS c ON q.question_id = c.question_id
  `;

  // Add filters for program and competency if provided
  const queryParams = [];
  if (program || competency) {
    query += ' WHERE';

    if (program) {
      query += ' q.program_id IN (SELECT program_id FROM program WHERE program_name LIKE ?)';
      queryParams.push(`%${program}%`);
    }

    if (competency) {
      if (program) {
        query += ' AND';
      }
      query += ' q.competency_id IN (SELECT competency_id FROM competency WHERE competency_name LIKE ?)';
      queryParams.push(`%${competency}%`);
    }
  }

  try {
    await conn.connect();

    conn.query(query, queryParams, (err, result) => {
      if (err) throw err;

      // Create an array to hold questions
      const questions = [];

      result.forEach((row) => {
        const questionId = row.question_id;
        const competencyId = row.competency_id;

        // Find the question in the array or create a new one
        let question = questions.find(q => q.question_id === questionId);
        if (!question) {
          question = {
            question_id: questionId,
            competency_id: competencyId,
            questionText: row.questionText,
            choices: [],
          };
          questions.push(question);
        }

        // Add choices to the respective question
        if (row.choiceText !== null) {
          question.choices.push({
            choiceText: row.choiceText,
            isCorrect: row.isCorrect,
          });
        }
      });

      res.json(questions);
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    conn.end();
  }
});
router.get("/search/:questionText", async (req, res) => {
  const { questionText } = req.params;
  const query = "SELECT * FROM question WHERE questionText LIKE ?";

  try {
    await conn.connect();

    conn.query(query, [`%${questionText}%`], (error, rows) => {
      if (error) throw error;
      res.json(rows);
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});



module.exports = router;
