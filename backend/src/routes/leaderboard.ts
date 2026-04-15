import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { getLeaderboard, getUserRank } from '../services/leaderboard.service';
import type { LeaderboardScope } from '@runzilla/shared/types';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { scope = 'national', week, limit = 100 } = req.query;

    if (scope !== 'national' && !scope.toString().startsWith('city:')) {
      return res.status(400).json({ error: 'Invalid scope', code: 'INVALID_SCOPE' });
    }

    const entries = await getLeaderboard(scope as LeaderboardScope, week as string, Number(limit));

    res.json({
      scope,
      week: week || new Date().toISOString().split('T')[0],
      entries,
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ error: 'Failed to get leaderboard', code: 'LEADERBOARD_ERROR' });
  }
});

router.get('/rank', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { scope = 'national', week } = req.query;
    const userId = req.user!.id;

    if (scope !== 'national' && !scope.toString().startsWith('city:')) {
      return res.status(400).json({ error: 'Invalid scope', code: 'INVALID_SCOPE' });
    }

    const rankData = await getUserRank(userId, scope as LeaderboardScope, week as string);

    res.json({
      scope,
      week: week || new Date().toISOString().split('T')[0],
      rank: rankData?.rank || null,
      score: rankData?.score || 0,
    });
  } catch (error) {
    console.error('Get rank error:', error);
    res.status(500).json({ error: 'Failed to get rank', code: 'RANK_ERROR' });
  }
});

export default router;