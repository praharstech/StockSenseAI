import React, { useState } from 'react';
import StockInput from './components/StockInput';
import AnalysisDashboard from './components/AnalysisDashboard';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import { StockData, AnalysisState, UserLocation } from './types';
import { analyzeStockPosition } from './services/geminiService';
import { logActivity } from './services/trackingService';
import { LineChart, BrainCircuit, LogOut } from 'lucide-react';

type ViewMode = 'USER_LOGIN' | 'USER_APP' | 'ADMIN_DASHBOARD';

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('USER_LOGIN');
  const [userEmail, setUserEmail] = useState('');
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);

  const [stockData, setStockData] = useState<StockData | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisState>({
    loading: false,
    error: null,
    result: null,
  });

  const handleLoginSuccess = (email: string, location: UserLocation | null) => {
    setUserEmail(email);
    setUserLocation(location);
    logActivity(email, 'LOGIN', 'Logged in to application', location);
    setViewMode('USER_APP');
  };

  const handleLogout = () => {
    setViewMode('USER_LOGIN');
    setUserEmail('');
    setUserLocation(null);
    handleReset();
  };

  const handleStockSubmit = async (data: StockData) => {
    setStockData(data);
    setAnalysis({ loading: true, error: null, result: null });
    
    // Log tracking info
    logActivity(userEmail, 'SEARCH_STOCK', `Searched ${data.symbol}`, userLocation);

    try {
      const result = await analyzeStockPosition(data);
      setAnalysis({ loading: false, error: null, result });
    } catch (error) {
      setAnalysis({
        loading: false,
        error: "Failed to fetch analysis. Please try again.",
        result: null,
      });
    }
  };

  const handleReset = () => {
    setStockData(null);
    setAnalysis({ loading: false, error: null, result: null });
  };

  // Render Admin View
  if (viewMode === 'ADMIN_DASHBOARD') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
         <AdminDashboard onLogout={() => setViewMode('USER_LOGIN')} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-500/30">
      {/* Dynamic Background Mesh */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-900/10 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-900/10 blur-[120px]"></div>
      </div>

      {viewMode === 'USER_LOGIN' ? (
        <div className="relative z-10 flex flex-col min-h-screen">
          <header className="p-6 border-b border-slate-900/50 backdrop-blur-sm">
            <div className="max-w-4xl mx-auto flex items-center gap-2">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-lg shadow-lg shadow-blue-900/20">
                <BrainCircuit className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white">
                StockSense<span className="text-blue-400">AI</span>
              </h1>
            </div>
          </header>
          <main className="flex-grow flex items-center justify-center p-6">
            <Login 
              onLoginSuccess={handleLoginSuccess} 
              onAdminClick={() => setViewMode('ADMIN_DASHBOARD')}
            />
          </main>
          <footer className="py-8 text-center text-slate-600 text-xs">
            <p>© {new Date().getFullYear()} StockSense AI. Secure Login Required.</p>
          </footer>
        </div>
      ) : (
        <>
          <header className="relative z-10 p-6 border-b border-slate-900/50 backdrop-blur-sm sticky top-0">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-lg shadow-lg shadow-blue-900/20">
                  <BrainCircuit className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-xl font-bold tracking-tight text-white hidden sm:block">
                  StockSense<span className="text-blue-400">AI</span>
                </h1>
              </div>
              
              <div className="flex items-center gap-4">
                 {stockData && (
                   <div className="text-xs font-mono text-slate-500 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
                     {stockData.symbol}
                   </div>
                 )}
                 <div className="flex items-center gap-2 pl-4 border-l border-slate-800">
                    <span className="text-xs text-slate-400 hidden sm:inline-block">
                      {userEmail}
                    </span>
                    <button 
                      onClick={handleLogout}
                      className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-500 hover:text-rose-400"
                      title="Logout"
                    >
                      <LogOut className="h-4 w-4" />
                    </button>
                 </div>
              </div>
            </div>
          </header>

          <main className="relative z-10 max-w-4xl mx-auto p-6 flex flex-col items-center justify-center min-h-[80vh]">
            {!analysis.result && !analysis.loading && !stockData ? (
              <div className="w-full flex flex-col items-center animate-in fade-in zoom-in duration-500">
                <div className="mb-10 text-center space-y-2">
                  <h2 className="text-4xl font-extrabold text-white sm:text-5xl tracking-tight">
                    Smart Portfolio <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Intelligence</span>
                  </h2>
                  <p className="text-slate-400 text-lg max-w-xl mx-auto">
                    Instant AI-powered break-even analysis and price forecasting for your stock positions.
                  </p>
                </div>
                <StockInput onSubmit={handleStockSubmit} isLoading={false} />
              </div>
            ) : null}

            {analysis.loading && (
              <div className="w-full flex flex-col items-center justify-center space-y-8 animate-in fade-in duration-700">
                 <div className="relative">
                    <div className="w-24 h-24 rounded-full border-t-2 border-b-2 border-blue-500 animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <LineChart className="h-8 w-8 text-blue-400 animate-pulse" />
                    </div>
                 </div>
                 <p className="text-slate-400 animate-pulse text-lg">Gathering market intelligence...</p>
              </div>
            )}

            {analysis.error && (
              <div className="w-full max-w-md bg-rose-950/30 border border-rose-900/50 p-6 rounded-2xl text-center space-y-4 animate-in shake">
                <p className="text-rose-400">{analysis.error}</p>
                <button 
                  onClick={handleReset}
                  className="text-sm bg-rose-900/50 hover:bg-rose-900 px-4 py-2 rounded-lg text-rose-200 transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}

            {analysis.result && stockData && (
              <AnalysisDashboard 
                data={analysis.result} 
                input={stockData} 
                onReset={handleReset}
              />
            )}
          </main>

          <footer className="relative z-10 py-8 text-center text-slate-600 text-xs">
            <p>© {new Date().getFullYear()} StockSense AI. Powered by Google Gemini.</p>
          </footer>
        </>
      )}
    </div>
  );
};

export default App;