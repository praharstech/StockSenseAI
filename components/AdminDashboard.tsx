import React, { useState, useEffect } from 'react';
import { getDashboardStats } from '../services/trackingService';
import { Users, Search, MapPin, Lock, LogOut, LayoutDashboard, TrendingUp, Activity } from 'lucide-react';
import { ActivityLog } from '../types';

interface AdminDashboardProps {
  onLogout: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [stats, setStats] = useState<ReturnType<typeof getDashboardStats> | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      // Load stats initially
      setStats(getDashboardStats());
      
      // Refresh stats every 5 seconds to simulate real-time monitoring
      const interval = setInterval(() => {
        setStats(getDashboardStats());
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'admin' && password === 'admin123') {
      setIsAuthenticated(true);
    } else {
      alert('Invalid Credentials (Try: admin / admin123)');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in slide-in-from-bottom-4">
        <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-2xl w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center p-3 bg-red-500/10 rounded-full mb-3">
              <Lock className="h-6 w-6 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-white">Admin Portal</h2>
            <p className="text-slate-500 text-xs mt-1">Authorized Personnel Only</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Username</label>
              <input 
                type="text" 
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-red-500 outline-none transition-colors"
                placeholder="admin"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-red-500 outline-none transition-colors"
                placeholder="••••••••"
              />
            </div>
            <button className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors">
              Access Dashboard
            </button>
          </form>
          <button onClick={onLogout} className="w-full text-center text-slate-500 text-xs mt-4 hover:text-white">
            ← Return to App
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-4 animate-in fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="bg-red-500/20 p-2 rounded-lg">
            <LayoutDashboard className="h-6 w-6 text-red-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Overview</h1>
            <p className="text-slate-400 text-xs">Real-time user monitoring system</p>
          </div>
        </div>
        <button 
          onClick={onLogout} 
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg text-sm transition-colors"
        >
          <LogOut className="h-4 w-4" /> Exit Portal
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-xs font-bold uppercase">Active Users (24h)</span>
            <Users className="h-5 w-5 text-blue-500" />
          </div>
          <div className="text-3xl font-bold text-white">{stats?.activeUsers || 0}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-xs font-bold uppercase">Total Searches</span>
            <Search className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="text-3xl font-bold text-white">{stats?.totalSearches || 0}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-xs font-bold uppercase">Top Trending</span>
            <TrendingUp className="h-5 w-5 text-purple-500" />
          </div>
          <div className="text-lg font-bold text-white truncate">
            {stats?.topStocks[0]?.name || "N/A"}
            <span className="text-slate-500 text-sm font-normal ml-2">
              ({stats?.topStocks[0]?.count || 0} hits)
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Activity Feed */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-400" />
            <h3 className="font-bold text-white">Live Activity Log</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-400">
              <thead className="bg-slate-950 text-slate-500 uppercase font-bold text-xs">
                <tr>
                  <th className="p-4">Time</th>
                  <th className="p-4">User</th>
                  <th className="p-4">Action</th>
                  <th className="p-4">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {stats?.recentActivity.map((log: ActivityLog) => (
                  <tr key={log.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="p-4 font-mono text-xs">{new Date(log.timestamp).toLocaleTimeString()}</td>
                    <td className="p-4 text-white font-medium">{log.email}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                        log.action === 'LOGIN' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'
                      }`}>
                        {log.details}
                      </span>
                    </td>
                    <td className="p-4 flex items-center gap-1.5 text-xs">
                      {log.location ? (
                        <>
                          <MapPin className="h-3 w-3 text-slate-500" />
                          {log.location.city ? log.location.city : `${log.location.lat.toFixed(2)}, ${log.location.lng.toFixed(2)}`}
                        </>
                      ) : (
                        <span className="text-slate-600">Unknown</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Stocks Sidebar */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden h-fit">
          <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-purple-400" />
            <h3 className="font-bold text-white">Most Searched</h3>
          </div>
          <div className="p-4 space-y-4">
             {stats?.topStocks.map((stock, idx) => (
               <div key={idx} className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                   <div className="w-6 h-6 rounded bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">
                     {idx + 1}
                   </div>
                   <span className="text-white font-medium">{stock.name}</span>
                 </div>
                 <div className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-300">
                   {stock.count} queries
                 </div>
               </div>
             ))}
             {(!stats?.topStocks || stats.topStocks.length === 0) && (
               <p className="text-center text-slate-500 text-sm py-4">No data yet</p>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;