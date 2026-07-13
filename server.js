require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const routes = require('./routes');

const app = express();

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('MONGO_URI env variable is missing.');
  process.exit(1);
}

// Database connection caching for serverless environments (Vercel)
let cachedPromise = null;
const connectDbMiddleware = async (req, res, next) => {
  if (mongoose.connection.readyState === 1) {
    return next();
  }
  try {
    if (!cachedPromise) {
      console.log('Connecting to database...');
      cachedPromise = mongoose.connect(MONGO_URI);
    }
    await cachedPromise;
    console.log('Database connected successfully!');
    next();
  } catch (err) {
    cachedPromise = null; // Reset promise on error
    console.error('Database connection error:', err);
    return res.status(500).json({ error: 'Database connection failed: ' + err.message });
  }
};

// Middlewares
app.use(cors());
app.use(express.json());
app.use(connectDbMiddleware);

// Routes
app.use('/api', routes);

// Base Route
app.get('/', (req, res) => {
  res.send('DesiBarEx API is running...');
});

// Only run app.listen locally (not in serverless environments like Vercel)
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app;
