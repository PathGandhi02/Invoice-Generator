import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageService } from './StorageService';
import { GuestDataService } from './GuestDataService';
export const preferencesStorage=new StorageService(AsyncStorage,'gigainvoice:v2:preferences:');
export const guestData = new GuestDataService(AsyncStorage, operation =>
  typeof navigator !== 'undefined' && navigator.locks
    ? navigator.locks.request('gigainvoice-guest-data', operation)
    : operation(), typeof window !== 'undefined' ? {
      getItem: key => window.localStorage.getItem(key),
      setItem: (key,value) => window.localStorage.setItem(key,value),
      removeItem: key => window.localStorage.removeItem(key),
    } : undefined);
// Quarantined previous-version data is never exposed to a guest or generic account.
export const legacyStorage=new StorageService(AsyncStorage);
