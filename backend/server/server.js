const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const authRoutes = require('./routes/authRoutes');
const { getConnection } = require('./config/db');

const app = express();
const port = 5005;

app.use(cors());
app.use(bodyParser.json());
app.use('/api/auth', authRoutes);

getConnection()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  })
  .catch(err => {
    console.log('Database connection error:', err);
    process.exit(1);
  });
