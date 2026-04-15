import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [weekStats, setWeekStats] = useState({ km: 0, xp: 0, rank: null as number | null });
  const [recentRuns, setRecentRuns] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [runsRes, leaderboardRes] = await Promise.all([
        api.runs.getRecent(5),
        api.leaderboard.get('national', 10),
      ]);

      if (runsRes.data) {
        const runs = runsRes.data.runs || [];
        setRecentRuns(runs);
        
        const totalKm = runs.reduce((sum: number, r: any) => sum + (r.distance_meters || 0) / 1000, 0);
        const totalXp = runs.reduce((sum: number, r: any) => sum + (r.xp_earned || 0), 0);
        setWeekStats({ km: totalKm, xp: totalXp, rank: null });
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getLevel = (xp: number) => {
    const thresholds = [0, 500, 1500, 3500, 7000, 12000, 20000, 35000, 60000, 100000];
    for (let i = thresholds.length - 1; i >= 0; i--) {
      if (xp >= thresholds[i]) return i + 1;
    }
    return 1;
  };

  const getXpForNextLevel = (xp: number) => {
    const thresholds = [0, 500, 1500, 3500, 7000, 12000, 20000, 35000, 60000, 100000];
    const currentLevel = getLevel(xp);
    if (currentLevel >= 10) return null;
    return thresholds[currentLevel] - xp;
  };

  const userLevel = user ? getLevel(user.xp || 0) : 1;
  const xpToNext = user ? getXpForNextLevel(user.xp || 0) : 500;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF6B35']} />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.name || 'Runner'}! 👋</Text>
          <Text style={styles.subtitle}>Let's go for a run</Text>
        </View>
        <TouchableOpacity style={styles.profileButton}>
          <Text style={styles.profileAvatar}>
            {user?.avatar || '🏃'}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.startRunCard} onPress={() => router.push('/run')}>
        <View style={styles.startRunContent}>
          <Text style={styles.startRunIcon}>🏃‍♂️</Text>
          <View style={styles.startRunText}>
            <Text style={styles.startRunTitle}>Start Running</Text>
            <Text style={styles.startRunSubtitle}>Track your run and earn XP</Text>
          </View>
          <Text style={styles.startRunArrow}>▶</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{weekStats.km.toFixed(1)}</Text>
          <Text style={styles.statLabel}>km this week</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{weekStats.xp}</Text>
          <Text style={styles.statLabel}>XP earned</Text>
        </View>
      </View>

      <View style={styles.levelCard}>
        <View style={styles.levelHeader}>
          <Text style={styles.levelTitle}>Level {userLevel}</Text>
          <Text style={styles.levelXp}>{user?.xp || 0} XP</Text>
        </View>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.min(((user?.xp || 0) % 500) / 5, 100)}%` },
            ]}
          />
        </View>
        {xpToNext && (
          <Text style={styles.xpToNext}>{xpToNext} XP to next level</Text>
        )}
      </View>

      <View style={styles.recentSection}>
        <Text style={styles.sectionTitle}>Recent Runs</Text>
        {recentRuns.length === 0 ? (
          <View style={styles.emptyRuns}>
            <Text style={styles.emptyRunsText}>No runs yet. Start your first run!</Text>
          </View>
        ) : (
          recentRuns.map((run: any, index: number) => (
            <View key={run.id || index} style={styles.runCard}>
              <View style={styles.runIcon}>
                <Text>🏃</Text>
              </View>
              <View style={styles.runDetails}>
                <Text style={styles.runDate}>
                  {new Date(run.created_at).toLocaleDateString()}
                </Text>
                <Text style={styles.runStats}>
                  {(run.distance_meters / 1000).toFixed(2)} km • {Math.floor(run.duration_secs / 60)} min
                </Text>
              </View>
              <View style={styles.runRewards}>
                <Text style={styles.runXp}>+{run.xp_earned} XP</Text>
                {run.money_earned_paise > 0 && (
                  <Text style={styles.runMoney}>+₹{run.money_earned_paise / 100}</Text>
                )}
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  profileButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileAvatar: {
    fontSize: 28,
  },
  startRunCard: {
    backgroundColor: '#FF6B35',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  startRunContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  startRunIcon: {
    fontSize: 40,
    marginRight: 16,
  },
  startRunText: {
    flex: 1,
  },
  startRunTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  startRunSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  startRunArrow: {
    fontSize: 20,
    color: '#fff',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  levelCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  levelTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  levelXp: {
    fontSize: 14,
    color: '#666',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF6B35',
    borderRadius: 4,
  },
  xpToNext: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    textAlign: 'right',
  },
  recentSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  emptyRuns: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyRunsText: {
    color: '#999',
    fontSize: 14,
  },
  runCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  runIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  runDetails: {
    flex: 1,
  },
  runDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  runStats: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  runRewards: {
    alignItems: 'flex-end',
  },
  runXp: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B35',
  },
  runMoney: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 2,
  },
});
