import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { useRouter } from 'expo-router';
import { LEVEL_THRESHOLDS, BADGES } from '@runzilla/shared/constants';

const AVATARS = ['🏃', '🏃‍♀️', '🏃‍♂️', '🧑‍🦯', '🏅', '🎽', '👟', '🔥'];

const BADGE_INFO: Record<string, { icon: string; name: string; description: string }> = {
  [BADGES.FIRST_RUN]: { icon: '🎉', name: 'First Run', description: 'Complete your first run' },
  [BADGES.KM_10]: { icon: '🏃', name: '10km Club', description: 'Run 10km total' },
  [BADGES.KM_50]: { icon: '🏅', name: '50km Club', description: 'Run 50km total' },
  [BADGES.KM_100]: { icon: '🎖️', name: '100km Club', description: 'Run 100km total' },
  [BADGES.STREAK_7]: { icon: '🔥', name: '7 Day Streak', description: 'Run 7 days in a row' },
  [BADGES.STREAK_30]: { icon: '⚡', name: '30 Day Streak', description: 'Run 30 days in a row' },
  [BADGES.STREAK_100]: { icon: '🌟', name: '100 Day Streak', description: 'Run 100 days in a row' },
  [BADGES.EARLY_BIRD]: { icon: '🌅', name: 'Early Bird', description: 'Run before 6am' },
  [BADGES.NIGHT_OWL]: { icon: '🌙', name: 'Night Owl', description: 'Run after 9pm' },
  [BADGES.SPEED_DEMON]: { icon: '💨', name: 'Speed Demon', description: 'Run under 5 min/km pace' },
};

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [stats, setStats] = useState({
    total_runs: 0,
    total_km: 0,
    total_xp: 0,
    streak_days: 0,
    badges: [] as string[],
  });

  const loadStats = async () => {
    try {
      const result = await api.profile.get();
      if (result.data) {
        setStats({
          total_runs: result.data.total_runs || 0,
          total_km: result.data.total_km || 0,
          total_xp: result.data.xp || 0,
          streak_days: result.data.streak_days || 0,
          badges: result.data.badges || [],
        });
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const getLevel = (xp: number) => {
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
      if (xp >= LEVEL_THRESHOLDS[i]) return i + 1;
    }
    return 1;
  };

  const getXpForNextLevel = (xp: number) => {
    const currentLevel = getLevel(xp);
    if (currentLevel >= LEVEL_THRESHOLDS.length) return null;
    return LEVEL_THRESHOLDS[currentLevel] - xp;
  };

  const userLevel = getLevel(user?.xp || stats.total_xp);
  const xpToNext = getXpForNextLevel(user?.xp || stats.total_xp);
  const progress = xpToNext ? ((user?.xp || stats.total_xp) - LEVEL_THRESHOLDS[userLevel - 1]) / (xpToNext || 1) * 100 : 100;

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatar}>{user?.avatar || AVATARS[0]}</Text>
        </View>
        <Text style={styles.name}>{user?.name || 'Runner'}</Text>
        <Text style={styles.city}>{user?.city || 'Select city'}</Text>
        <View style={styles.levelBadge}>
          <Text style={styles.levelText}>Level {userLevel}</Text>
        </View>
      </View>

      <View style={styles.xpCard}>
        <View style={styles.xpHeader}>
          <Text style={styles.xpTitle}>Experience</Text>
          <Text style={styles.xpValue}>{user?.xp || stats.total_xp} XP</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        {xpToNext && (
          <Text style={styles.xpToNext}>{xpToNext} XP to Level {userLevel + 1}</Text>
        )}
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.total_runs}</Text>
          <Text style={styles.statLabel}>Runs</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.total_km.toFixed(1)}</Text>
          <Text style={styles.statLabel}>km</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.streak_days}</Text>
          <Text style={styles.statLabel}>Day Streak</Text>
        </View>
      </View>

      <View style={styles.badgesSection}>
        <Text style={styles.sectionTitle}>Badges ({stats.badges.length})</Text>
        <View style={styles.badgesGrid}>
          {stats.badges.length === 0 ? (
            <Text style={styles.noBadges}>Complete runs to earn badges!</Text>
          ) : (
            stats.badges.map((badge) => {
              const info = BADGE_INFO[badge];
              return (
                <View key={badge} style={styles.badgeCard}>
                  <Text style={styles.badgeIcon}>{info?.icon || '🏅'}</Text>
                  <Text style={styles.badgeName}>{info?.name || badge}</Text>
                </View>
              );
            })
          )}
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    paddingBottom: 40,
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  profileCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    fontSize: 40,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  city: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  levelBadge: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 12,
  },
  levelText: {
    color: '#fff',
    fontWeight: '600',
  },
  xpCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  xpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  xpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  xpValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B35',
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
  statsGrid: {
    flexDirection: 'row',
    marginHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  badgesSection: {
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  noBadges: {
    color: '#999',
    fontSize: 14,
  },
  badgeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    width: '30%',
  },
  badgeIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  badgeName: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
  },
  logoutButton: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ff4444',
  },
  logoutText: {
    color: '#ff4444',
    fontSize: 16,
    fontWeight: '600',
  },
});
