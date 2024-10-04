const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const connection = mysql.createConnection({
  host: '156.67.222.52',
  user: 'u552141195_fun_user',
  password: 'Fun_@pp_2024',
  database: 'u552141195_fun_app'
});

connection.connect((err) => {
  if (err) {
    console.error('Erro ao conectar ao MySQL:', err);
  } else {
    console.log('Conectado ao MySQL!');
  }
});

app.post('/save', (req, res) => {
  const { name, email } = req.body;
  
  const query = 'INSERT INTO user (name, email) VALUES (?, ?)';
  connection.query(query, [name, email], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err });
    }
    res.status(200).json({ message: 'user saved!' });
  });
});

app.post('/user_details', (req, res) => {
  const { id } = req.body;
  
  if (!id) {
    return res.status(400).json({ error: 'ID should not be null' });
  }

  const query = 'SELECT name, score, lucky_symbol,tickets FROM user WHERE id = ?';
  
  connection.query(query, [id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ message: 'user not found' });
    }
    
    res.status(200).json({ user: results[0] });
  });
});


const port = 3001;
app.listen(port, () => {
  console.log(`server port ${port}`);
});
