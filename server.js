const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Configuração da conexão MySQL
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

// Exemplo de rota POST para salvar dados
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

const port = 3001;
app.listen(port, () => {
  console.log(`server port ${port}`);
});
