import dotenv from 'dotenv';
dotenv.config({ path: __dirname + '/../.env' });

console.log('Loading env from:', __dirname + '/../.env');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL);

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import cron from 'node-cron';

import authRoutes from './routes/auth';
import profileRoutes from './routes/profile';
import runsRoutes from './routes/runs';
import leaderboardRoutes from './routes/leaderboard';
import walletRoutes from './routes/wallet';
import { authMiddleware } from './middleware/auth';
import { snapshotLeaderboard, resetLeaderboard } from './services/leaderboard.service';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Too many requests', code: 'RATE_LIMITED' },
});
app.use('/api', limiter);

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/runs', runsRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/wallet', walletRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
});

function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

cron.schedule('55 18 * * 0', async () => {
  console.log('Running weekly leaderboard snapshot...');
  try {
    const lastWeekStart = getWeekStart(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    await snapshotLeaderboard(lastWeekStart);
    console.log('Leaderboard snapshot completed');
  } catch (error) {
    console.error('Snapshot error:', error);
  }
});

cron.schedule('0 0 * * 1', async () => {
  console.log('Resetting leaderboard for new week...');
  try {
    const newWeekStart = getWeekStart();
    await resetLeaderboard(newWeekStart);
    console.log('Leaderboard reset completed');
  } catch (error) {
    console.error('Reset error:', error);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Runzilla API running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Timezone: ${process.env.TZ || 'Asia/Kolkata'}`);
});

export default app;