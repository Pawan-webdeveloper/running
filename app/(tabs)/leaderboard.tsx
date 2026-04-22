import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Platform } from 'react-native';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

const AVATARS = ['🏃', '🏃‍♀️', '🏃‍♂️', '🧑‍🦯', '🏅', '🎽', '👟', '🔥'];

export default function LeaderboardScreen() {
  const { user } = useAuthStore();
  const [scope, setScope] = useState<'national' | `city:${string}`>('national');
  const [entries, setEntries] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const isLocalWebPreview = Platform.OS === 'web' && api.auth.getApiUrl().includes('localhost:3000');

  const loadLeaderboard = async () => {
    if (isLocalWebPreview) {
      setEntries([]);
      return;
    }

    try {
      const result = await api.leaderboard.get(scope, 50);
      setEntries(result?.leaderboard || []);
    } catch {
      setEntries([]);
    }
  };

  useEffect(() => {
    loadLeaderboard();
  }, [scope, isLocalWebPreview]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLeaderboard();
    setRefreshing(false);
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const isCurrentUser = item.user_id === user?.id;
    return (
      <View style={[styles.entry, isCurrentUser && styles.currentUserEntry]}>
        <View style={styles.rankContainer}>
          <Text style={[styles.rank, index < 3 && styles.topRank]}>
            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.avatar}>{AVATARS[item.avatar_index % AVATARS.length]}</Text>
          <View style={styles.nameContainer}>
            <Text style={[styles.name, isCurrentUser && styles.currentUserName]}>
              {item.name || 'Anonymous'}
              {isCurrentUser && ' (You)'}
            </Text>
            {item.city && <Text style={styles.city}>{item.city}</Text>}
          </View>
        </View>
        <View style={styles.stats}>
          <Text style={styles.xp}>{item.xp?.toLocaleString()} XP</Text>
          <Text style={styles.level}>Level {item.level || 1}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Leaderboard</Text>
        <View style={styles.scopeTabs}>
          <TouchableOpacity
            style={[styles.scopeTab, scope === 'national' && styles.scopeTabActive]}
            onPress={() => setScope('national')}
          >
            <Text style={[styles.scopeText, scope === 'national' && styles.scopeTextActive]}>
              National 🌍
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.scopeTab, scope !== 'national' && styles.scopeTabActive]}
            onPress={() => setScope('city:Bangalore')}
          >
            <Text style={[styles.scopeText, scope !== 'national' && styles.scopeTextActive]}>
              City 🏙️
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={entries}
        renderItem={renderItem}
        keyExtractor={(item, index) => item.user_id || index.toString()}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF6B35']} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No runners yet. Be the first!</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  scopeTabs: {
    flexDirection: 'row',
    gap: 12,
  },
  scopeTab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  scopeTabActive: {
    backgroundColor: '#FF6B35',
  },
  scopeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  scopeTextActive: {
    color: '#fff',
  },
  list: {
    padding: 16,
  },
  entry: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  currentUserEntry: {
    borderWidth: 2,
    borderColor: '#FF6B35',
  },
  rankContainer: {
    width: 50,
    alignItems: 'center',
  },
  rank: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  topRank: {
    fontSize: 24,
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    fontSize: 32,
    marginRight: 12,
  },
  nameContainer: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  currentUserName: {
    color: '#FF6B35',
  },
  city: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  stats: {
    alignItems: 'flex-end',
  },
  xp: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B35',
  },
  level: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  empty: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
  },
});
