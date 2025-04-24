const express = require("express");
const pool = require("../configs/db");
const router = express.Router();

// GET all questions
router.get("/", (req, res) => {
  pool.query("SELECT * FROM Questions", (err, results) => {
    if (err) {
      console.error("Error fetching Questions:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
    res.json(results);
  });
});

// GET all questions by beta_block_id
router.get("/beta-block/:betaBlockId", async (req, res) => {
  try {
    const { betaBlockId } = req.params;

    // Aqui está o ponto crucial:
    const [rows] = await pool.promise().query(
      "SELECT * FROM Questions WHERE beta_block_id = ?",
      [betaBlockId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "No questions found for this beta_block_id" });
    }

    res.json(rows);
  } catch (error) {
    console.error("Error fetching questions:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET a single question by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = pool.query(
      "SELECT * FROM Questions WHERE question_id = ?",
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Question not found" });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error("Error fetching question:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// CREATE a new question
router.post("/", async (req, res) => {
  try {
    const { question, actived, beta_block_id } = req.body;

    // ✅ Await and use .promise()
    const [result] = await pool.promise().query(
      "INSERT INTO Questions (question, actived, beta_block_id) VALUES (?, ?, ?)",
      [question, actived, beta_block_id]
    );

    // Return the newly created question with its auto-generated id.
    const newQuestion = {
      question_id: result.insertId,
      question,
      actived,
    };

    res.status(201).json(newQuestion);
  } catch (error) {
    console.error("Error creating question:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// UPDATE an existing question
router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { question, actived } = req.body;

  pool.query(
    "UPDATE Questions SET question = ?, actived = ? WHERE question_id = ?",
    [question, actived, id],
    (err, result) => {
      if (err) {
        console.error("Error updating question:", err);
        return res.status(500).json({ error: "Internal server error" });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Question not found" });
      }
      res.json({ question_id: id, question, actived });
    }
  );
});

// DELETE a question
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.promise().query(
      "DELETE FROM Questions WHERE question_id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Question not found" });
    }

    res.json({ message: "Question deleted successfully" });
  } catch (error) {
    console.error("Error deleting question:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/many_questions", async (req, res) => {
  try {
    const { text, actived = true, beta_block_id = null } = req.body;

    if (!text || typeof text !== "string") {
      return res
        .status(400)
        .json({ error: "Invalid input. Expected a string." });
    }

    // Split text by new lines and trim each line
    const questions = text
      .split("\n")
      .map((q) => q.trim())
      .filter((q) => q.length > 0); // remove empty lines

    if (questions.length === 0) {
      return res.status(400).json({ error: "No valid questions provided." });
    }

    // Prepare values for bulk insert
    const values = questions.map((q) => [q, actived, beta_block_id]);

    const promisePool = pool.promise();

    const [result] = await promisePool.query(
      "INSERT INTO Questions (question, actived, beta_block_id) VALUES ?",
      [values]
    );

    res.status(201).json({
      message: "Questions imported successfully",
      affectedRows: result.affectedRows,
    });
  } catch (error) {
    console.error("Error importing questions from text:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;