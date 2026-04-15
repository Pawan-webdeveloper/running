import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

export default function WalletScreen() {
  const { token, user } = useAuthStore();

  const [wallet, setWallet] = useState({
    balance_paise: 0,
    lifetime_earned_paise: 0,
    transactions: [] as any[],
  });
  const [loading, setLoading] = useState(false);

  const loadWallet = async () => {
    setLoading(true);
    try {
      const result = await api.wallet.get();
      if (result.data) {
        setWallet(result.data);
      }
    } catch (error) {
      console.error('Failed to load wallet:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (token) {
      loadWallet();
    }
  }, [token]);

  const formatCurrency = (paise: number) => {
    return `₹${(paise / 100).toFixed(2)}`;
  };

  const renderTransaction = ({ item }: { item: any }) => (
    <View style={styles.transaction}>
      <View style={styles.transactionInfo}>
        <Text style={styles.transactionDescription}>{item.description}</Text>
        <Text style={styles.transactionDate}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
      <Text style={[styles.transactionAmount, item.amount_paise > 0 && styles.positive]}>
        {item.amount_paise > 0 ? '+' : ''}{formatCurrency(item.amount_paise)}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Wallet</Text>
      </View>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Available Balance</Text>
        <Text style={styles.balance}>{formatCurrency(wallet.balance_paise)}</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Lifetime Earnings</Text>
            <Text style={styles.statValue}>{formatCurrency(wallet.lifetime_earned_paise)}</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.withdrawButton} disabled={wallet.balance_paise === 0}>
        <Text style={styles.withdrawButtonText}>Withdraw Money</Text>
      </TouchableOpacity>

      <View style={styles.transactionsSection}>
        <Text style={styles.sectionTitle}>Transactions</Text>
        <FlatList
          data={wallet.transactions}
          renderItem={renderTransaction}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.transactionsList}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No transactions yet</Text>
            </View>
          }
        />
      </View>
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
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  balanceCard: {
    backgroundColor: '#FF6B35',
    margin: 16,
    borderRadius: 16,
    padding: 24,
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  balance: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
    marginVertical: 8,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 16,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginTop: 4,
  },
  withdrawButton: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF6B35',
  },
  withdrawButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B35',
  },
  transactionsSection: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  transactionsList: {
    paddingBottom: 20,
  },
  transaction: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  transactionDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  positive: {
    color: '#4CAF50',
  },
  empty: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#999',
    fontSize: 14,
  },
});
