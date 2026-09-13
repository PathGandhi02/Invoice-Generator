import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageService } from './StorageService';
export const preferencesStorage=new StorageService(AsyncStorage,'gigainvoice:v2:preferences:');
export const guestStorage=new StorageService(AsyncStorage,'gigainvoice:v2:guest:');
// Quarantined previous-version data is never exposed to a guest or generic account.
export const legacyStorage=new StorageService(AsyncStorage);
