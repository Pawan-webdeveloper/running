import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { SUPPORTED_CITIES } from '@runzilla/shared/constants';

const AVATARS = ['🏃', '🏃‍♀️', '🏃‍♂️', '🧑‍🦯', '🏅', '🎽', '👟', '🔥'];

export default function OnboardingScreen() {
  const router = useRouter();
  const { user, setAuth } = useAuthStore();

  const [name, setName] = useState(user?.name || '');
  const [city, setCity] = useState(user?.city || '');
  const [avatarIndex, setAvatarIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);

  const handleComplete = async () => {
    if (name.length < 2) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }
    if (!city) {
      Alert.alert('Error', 'Please select your city');
      return;
    }

    setLoading(true);
    try {
      const result = await api.profile.update({
        display_name: name,
        city,
        avatar_index: avatarIndex,
      });

      if (result.error) {
        Alert.alert('Error', result.error);
        setLoading(false);
        return;
      }

      if (result.data?.profile) {
        await setAuth(result.data.token, result.data.profile);
      }
      
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    }
    setLoading(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Complete Your Profile</Text>
        <Text style={styles.subtitle}>Set up your runner profile</Text>
      </View>

      <View style={styles.avatarContainer}>
        <Text style={styles.avatarDisplay}>{AVATARS[avatarIndex]}</Text>
        <Text style={styles.avatarLabel}>Choose your avatar</Text>
        <View style={styles.avatarGrid}>
          {AVATARS.map((avatar, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.avatarOption,
                avatarIndex === index && styles.avatarSelected,
              ]}
              onPress={() => setAvatarIndex(index)}
            >
              <Text style={styles.avatarEmoji}>{avatar}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Display Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Enter your name"
          autoCapitalize="words"
        />

        <Text style={styles.label}>City</Text>
        <TouchableOpacity
          style={styles.cityInput}
          onPress={() => setShowCityPicker(!showCityPicker)}
        >
          <Text style={city ? styles.cityText : styles.cityPlaceholder}>
            {city || 'Select your city'}
          </Text>
        </TouchableOpacity>

        {showCityPicker && (
          <View style={styles.cityList}>
            {SUPPORTED_CITIES.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.cityOption, city === c && styles.citySelected]}
                onPress={() => {
                  setCity(c);
                  setShowCityPicker(false);
                }}
              >
                <Text
                  style={[
                    styles.cityOptionText,
                    city === c && styles.citySelectedText,
                  ]}
                >
                  {c}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleComplete}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Saving...' : 'Get Started'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarDisplay: {
    fontSize: 80,
    marginBottom: 8,
  },
  avatarLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  avatarOption: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarSelected: {
    backgroundColor: '#FF6B35',
  },
  avatarEmoji: {
    fontSize: 28,
  },
  form: {
    marginBottom: 32,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    fontSize: 18,
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginBottom: 16,
    color: '#333',
  },
  cityInput: {
    fontSize: 18,
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginBottom: 8,
    color: '#333',
  },
  cityText: {
    fontSize: 18,
    color: '#333',
  },
  cityPlaceholder: {
    fontSize: 18,
    color: '#999',
  },
  cityList: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  cityOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  citySelected: {
    backgroundColor: '#FF6B35',
  },
  cityOptionText: {
    fontSize: 16,
    color: '#333',
  },
  citySelectedText: {
    color: '#fff',
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
