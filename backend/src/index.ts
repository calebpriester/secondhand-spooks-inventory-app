import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import bookRoutes from './routes/bookRoutes';
import { initializeDatabase } from './utils/initDb';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/books', bookRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend static files in production
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '../public');
  app.use(express.static(frontendPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

// Initialize DB then start server
async function start() {
  try {
    await initializeDatabase();
  } catch (err) {
    console.error('Database initialization failed after retries:', err);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`🎃 Secondhand Spooks API running on port ${PORT}`);
  });
}

start();
