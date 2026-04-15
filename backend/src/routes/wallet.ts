import { Router } from 'express';
import { supabaseAdmin } from '../db/supabase';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const { data: wallet, error } = await supabaseAdmin
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !wallet) {
      return res.json({
        balance_paise: 0,
        lifetime_earned_paise: 0,
        transactions: [],
      });
    }

    const { data: payouts } = await supabaseAdmin
      .from('payouts')
      .select('*')
      .eq('user_id', userId)
      .order('initiated_at', { ascending: false })
      .limit(20);

    res.json({
      balance_paise: wallet.balance_paise,
      lifetime_earned_paise: wallet.lifetime_earned_paise,
      transactions: payouts || [],
    });
  } catch (error) {
    console.error('Get wallet error:', error);
    res.status(500).json({ error: 'Failed to get wallet', code: 'WALLET_ERROR' });
  }
});

export default router;