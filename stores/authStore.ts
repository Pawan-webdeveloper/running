import { create } from 'zustand';
import { setAuthToken } from '@/lib/api';
import { deleteStoredItem, getStoredItem, setStoredItem } from '@/lib/authStorage';

interface User {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  city: string | null;
  xp: number;
  level: number;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  setAuth: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  loadAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isLoading: true,

  setAuth: async (token: string, user: User) => {
    await setStoredItem('auth_token', token);
    await setStoredItem('user_data', JSON.stringify(user));
    await setAuthToken(token);
    set({ token, user });
  },

  logout: async () => {
    await deleteStoredItem('auth_token');
    await deleteStoredItem('user_data');
    await setAuthToken('');
    set({ token: null, user: null });
  },

  loadAuth: async () => {
    try {
      const token = await getStoredItem('auth_token');
      const userData = await getStoredItem('user_data');
      if (token && userData) {
        await setAuthToken(token);
        set({ token, user: JSON.parse(userData) });
      }
    } catch (error) {
      console.error('Failed to load auth:', error);
    } finally {
      set({ isLoading: false });
    }
  },
}));
