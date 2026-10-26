import dotenv from 'dotenv';
import mongoose from 'mongoose';
import app from './app.js';

dotenv.config();

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/kisansetu';

async function startServer() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log(`[KisanSetu] Connected to MongoDB`);
    app.listen(PORT, () => {
      console.log(`[KisanSetu] API Server listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('[KisanSetu] Failed to connect to MongoDB:', err.message);
    process.exit(1);
  }
}

startServer();
