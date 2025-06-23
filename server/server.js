import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import authRoutes from './routes/authRoutes.js';
import requestRoutes from './routes/requestsRoutes.js';
import { getConnection } from './config/db.js';

const app = express();
const port = process.env.PORT || 5005;

app.use(cors({
  origin: ['http://localhost:3000', 'https://parking-app.vercel.app', 'http://localhost:3001' ],
  credentials: true
}));

app.use(bodyParser.json());
app.use('/api/auth', authRoutes);
app.use('/api/requests', requestRoutes);

getConnection()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server is running port ${port}`);
    });
  })
  .catch((err) => {
    console.error('Database connection error:', err);
    process.exit(1);
  });

export default app;