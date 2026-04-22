import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

function canUseLocalStorage() {
  return Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export async function setStoredItem(key: string, value: string) {
  if (canUseLocalStorage()) {
    window.localStorage.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

export async function getStoredItem(key: string) {
  if (canUseLocalStorage()) {
    return window.localStorage.getItem(key);
  }

  return SecureStore.getItemAsync(key);
}

export async function deleteStoredItem(key: string) {
  if (canUseLocalStorage()) {
    window.localStorage.removeItem(key);
    return;
  }

  await SecureStore.deleteItemAsync(key);
}
