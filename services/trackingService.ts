import { ActivityLog, UserLocation } from '../types';

const STORAGE_KEY = 'stocksense_activity_logs';

// Helper to generate a random city name based on coordinates (Mocking reverse geocoding)
const mockReverseGeocode = (lat: number, lng: number): string => {
  const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata'];
  // Deterministic "random" city based on decimal points
  const index = Math.floor((Math.abs(lat * lng) * 100) % cities.length);
  return cities[index];
};

export const logActivity = (
  email: string, 
  action: 'LOGIN' | 'SEARCH_STOCK', 
  details: string,
  location: UserLocation | null
) => {
  const logs = getLogs();
  
  // Enhance location with a mock city if not present
  const finalLocation = location ? {
    ...location,
    city: location.city || mockReverseGeocode(location.lat, location.lng)
  } : null;

  const newLog: ActivityLog = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    email,
    action,
    details,
    location: finalLocation
  };

  const updatedLogs = [newLog, ...logs].slice(0, 100); // Keep last 100 logs
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLogs));
};

export const getLogs = (): ActivityLog[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

export const getDashboardStats = () => {
  const logs = getLogs();
  
  // Calculate unique users in the last 24 hours
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const recentLogs = logs.filter(log => log.timestamp > oneDayAgo);
  const uniqueUsers = new Set(recentLogs.map(log => log.email)).size;
  
  // Calculate most searched stocks
  const stockSearches = logs.filter(log => log.action === 'SEARCH_STOCK');
  const stockCounts: Record<string, number> = {};
  stockSearches.forEach(log => {
    // details format: "Searched SYMBOL"
    const symbol = log.details.replace('Searched ', '');
    stockCounts[symbol] = (stockCounts[symbol] || 0) + 1;
  });

  const topStocks = Object.entries(stockCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  return {
    activeUsers: uniqueUsers,
    totalSearches: stockSearches.length,
    topStocks,
    recentActivity: logs.slice(0, 10)
  };
};