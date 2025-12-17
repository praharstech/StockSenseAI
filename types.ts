export interface StockData {
  symbol: string;
  buyPrice: number;
  quantity: number;
  strategy: 'intraday' | 'long-term';
}

export interface ChartDataPoint {
  label: string; // Changed from 'day' to 'label' to support hours or days
  price: number;
  type: 'historical' | 'forecast';
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface NewsItem {
  headline: string;
  summary: string;
  sentiment: 'positive' | 'negative' | 'neutral';
}

export interface StockQuote {
  currentPrice: number;
  suggestedBuy: number;
  suggestedSell: number;
}

export interface AnalysisResult {
  analysisText: string;
  sources: GroundingSource[];
  chartData: ChartDataPoint[];
  currentPriceEstimate?: number; // Extracted from text if possible
  sentiment: 'bullish' | 'bearish' | 'neutral';
  news: NewsItem[];
}

export interface AnalysisState {
  loading: boolean;
  error: string | null;
  result: AnalysisResult | null;
}

export interface UserLocation {
  lat: number;
  lng: number;
  city?: string; // Optional simulated city name
}

export interface ActivityLog {
  id: string;
  timestamp: number;
  email: string;
  action: 'LOGIN' | 'SEARCH_STOCK';
  details: string; // e.g., "Searched RELIANCE" or "Logged in"
  location: UserLocation | null;
}