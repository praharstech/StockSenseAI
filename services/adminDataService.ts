import { ManualAd, ManualSuggestion, UserProfile } from '../types';

const KEYS = {
  ADS: 'stocksense_manual_ads',
  SUGGESTIONS: 'stocksense_manual_suggestions',
  ADMIN_PWD: 'stocksense_admin_password',
  USERS: 'stocksense_user_profiles'
};

// --- AUTHENTICATION ---
export const getAdminPassword = (): string | null => {
  return localStorage.getItem(KEYS.ADMIN_PWD);
};

export const setAdminPassword = (password: string) => {
  localStorage.setItem(KEYS.ADMIN_PWD, password);
};

// --- USER PROFILES ---
export const getUserProfiles = (): UserProfile[] => {
  const data = localStorage.getItem(KEYS.USERS);
  return data ? JSON.parse(data) : [];
};

export const saveUserProfile = (profile: UserProfile) => {
  const users = getUserProfiles();
  const existingIndex = users.findIndex(u => u.email === profile.email);
  if (existingIndex > -1) {
    users[existingIndex] = profile;
  } else {
    users.push(profile);
  }
  localStorage.setItem(KEYS.USERS, JSON.stringify(users));
};

export const getUserProfile = (email: string): UserProfile | undefined => {
  return getUserProfiles().find(u => u.email === email);
};

// --- MANUAL ADS ---
export const getManualAds = (): ManualAd[] => {
  const data = localStorage.getItem(KEYS.ADS);
  return data ? JSON.parse(data) : [];
};

export const addManualAd = (ad: Omit<ManualAd, 'id'>) => {
  const ads = getManualAds();
  const newAd = { ...ad, id: crypto.randomUUID() };
  localStorage.setItem(KEYS.ADS, JSON.stringify([newAd, ...ads]));
};

export const deleteManualAd = (id: string) => {
  const ads = getManualAds().filter(a => a.id !== id);
  localStorage.setItem(KEYS.ADS, JSON.stringify(ads));
};

// --- MANUAL SUGGESTIONS ---
export const getManualSuggestions = (): ManualSuggestion[] => {
  const data = localStorage.getItem(KEYS.SUGGESTIONS);
  return data ? JSON.parse(data) : [];
};

export const addManualSuggestion = (sug: Omit<ManualSuggestion, 'id' | 'timestamp'>) => {
  const sugs = getManualSuggestions();
  const newSug = { ...sug, id: crypto.randomUUID(), timestamp: Date.now() };
  localStorage.setItem(KEYS.SUGGESTIONS, JSON.stringify([newSug, ...sugs]));
};

export const deleteManualSuggestion = (id: string) => {
  const sugs = getManualSuggestions().filter(s => s.id !== id);
  localStorage.setItem(KEYS.SUGGESTIONS, JSON.stringify(sugs));
};