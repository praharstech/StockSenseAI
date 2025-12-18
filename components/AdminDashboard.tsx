
import React, { useState, useEffect } from 'react';
import { getDashboardStats, getLogs } from '../services/trackingService';
import { 
  getAdminPassword, setAdminPassword, 
  getManualAds, addManualAd, deleteManualAd,
  getManualSuggestions, addManualSuggestion, deleteManualSuggestion,
  getUserProfiles
} from '../services/adminDataService';
import { 
  Users, Search, MapPin, Lock, LogOut, 
  TrendingUp, Activity, Megaphone, Lightbulb, Trash2, Plus, 
  Key, ShieldCheck, Target, Send, X, Briefcase
} from 'lucide-react';
import { ActivityLog, ManualAd, ManualSuggestion, UserProfile } from '../types';

interface AdminDashboardProps {
  onLogout: () => void;
}

type Tab = 'ACTIVITY' | 'ADS' | 'SUGGESTIONS' | 'USERS';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('ACTIVITY');
  const [password, setPassword] = useState('');
  const [isSettingUp, setIsSettingUp] = useState(false);
  
  // Stats & Management Data
  const [stats, setStats] = useState<ReturnType<typeof getDashboardStats> | null>(null);
  const [ads, setAds] = useState<ManualAd[]>([]);
  const [suggestions, setSuggestions] = useState<ManualSuggestion[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);

  // Form States
  const [adForm, setAdForm] = useState({ title: '', description: '', link: '', ctaText: 'Visit Now' });
  const [sugForm, setSugForm] = useState({ symbol: '', action: 'BUY' as const, target: 0, stopLoss: 0, reason: '', targetUserEmail: '' });

  useEffect(() => {
    const storedPwd = getAdminPassword();
    if (!storedPwd) setIsSettingUp(true);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      const refreshData = () => {
        setStats(getDashboardStats());
        setAds(getManualAds());
        setSuggestions(getManualSuggestions());
        setUsers(getUserProfiles());
      };
      refreshData();
      const interval = setInterval(refreshData, 5000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSettingUp) {
      if (password.length < 6) { return alert('Min 6 characters'); }
      setAdminPassword(password);
      setIsSettingUp(false);
      setIsAuthenticated(true);
    } else {
      if (password === getAdminPassword()) setIsAuthenticated(true);
      else alert('Incorrect Password');
    }
  };

  const handleAddAd = (e: React.FormEvent) => {
    e.preventDefault();
    addManualAd(adForm);
    setAds(getManualAds());
    setAdForm({ title: '', description: '', link: '', ctaText: 'Visit Now' });
  };

  const handleAddSuggestion = (e: React.FormEvent) => {
    e.preventDefault();
    addManualSuggestion(sugForm);
    setSuggestions(getManualSuggestions());
    setSugForm({ symbol: '', action: 'BUY', target: 0, stopLoss: 0, reason: '', targetUserEmail: '' });
  };

  const getUserSearchInterests = (email: string) => {
    const logs = getLogs().filter(l => l.email === email && l.action === 'SEARCH_STOCK');
    const interests = Array.from(new Set(logs.map(l => l.details.replace('Searched ', ''))));
    return interests;
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 p-4">
        <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-2xl w-full max-w-sm">
          <div className="text-center mb-6">
            <div className={`inline-flex items-center justify-center p-3 rounded-2xl mb-3 ${isSettingUp ? 'bg-blue-500/10' : 'bg-red-500/10'}`}>
              {isSettingUp ? <Key className="h-6 w-6 text-blue-500" /> : <Lock className="h-6 w-6 text-red-500" />}
            </div>
            <h2 className="text-xl font-bold text-white">{isSettingUp ? 'First Time Setup' : 'Admin Area'}</h2>
          </div>
          <form onSubmit={handleAuth} className="space-y-4">
            <input 
              type="password" 
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-red-500 outline-none"
              placeholder="Enter Admin Password"
              required
            />
            <button className={`w-full font-bold py-3 rounded-xl transition-all text-white ${isSettingUp ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'}`}>
              {isSettingUp ? 'Set Password' : 'Login'}
            </button>
          </form>
          <button onClick={onLogout} className="w-full text-center text-slate-500 text-xs mt-4 underline">Exit to App</button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-8 animate-in fade-in">
      {/* Header Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2.5 rounded-xl"><ShieldCheck className="h-6 w-6 text-white" /></div>
          <div><h1 className="text-2xl font-bold text-white">StockSense Admin</h1><p className="text-slate-500 text-xs">Manage suggestions and users</p></div>
        </div>
        
        <div className="flex flex-wrap bg-slate-900 p-1 rounded-2xl border border-slate-800">
          {(['ACTIVITY', 'USERS', 'ADS', 'SUGGESTIONS'] as const).map((tabId: Tab) => {
            const icons: Record<Tab, React.ElementType> = { ACTIVITY: Activity, USERS: Users, ADS: Megaphone, SUGGESTIONS: Lightbulb };
            const labels: Record<Tab, string> = { ACTIVITY: 'Stats', USERS: 'Users', ADS: 'Ads', SUGGESTIONS: 'Pro Tips' };
            const IconComp = icons[tabId];
            return (
              <button 
                key={tabId}
                onClick={() => setActiveTab(tabId)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all ${activeTab === tabId ? 'bg-slate-800 text-white font-bold' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <IconComp className="h-4 w-4" /> {labels[tabId]}
              </button>
            );
          })}
        </div>

        <button onClick={onLogout} className="flex items-center gap-2 text-slate-500 hover:text-rose-400 px-4 py-2"><LogOut className="h-4 w-4" /> Exit</button>
      </div>

      {activeTab === 'ACTIVITY' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard label="Active (24h)" val={stats?.activeUsers || 0} icon={Users} color="blue" />
            <StatCard label="Total Queries" val={stats?.totalSearches || 0} icon={Search} color="emerald" />
            <StatCard label="Trending Symbol" val={stats?.topStocks[0]?.name || "N/A"} icon={TrendingUp} color="purple" />
          </div>
          <RecentActivity logs={stats?.recentActivity || []} />
        </div>
      )}

      {activeTab === 'USERS' && (
        <div className="space-y-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden">
            <table className="w-full text-left text-sm text-slate-400">
              <thead className="bg-slate-950/50 text-slate-500 uppercase font-bold text-[10px]">
                <tr>
                  <th className="p-4">User Details</th>
                  <th className="p-4">Location/Prof</th>
                  <th className="p-4">Interests (Searched)</th>
                  <th className="p-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {users.map((user: UserProfile) => (
                  <tr key={user.email} className="hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <div className="text-white font-bold">{user.name}</div>
                      <div className="text-xs text-slate-500">{user.email}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3" /> {user.city}</div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500"><Briefcase className="h-3 w-3" /> {user.profession}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {getUserSearchInterests(user.email).map((s: string) => (
                          <span key={s} className="bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded text-[10px] font-bold">{s}</span>
                        ))}
                        {getUserSearchInterests(user.email).length === 0 && <span className="text-slate-700 text-[10px]">No searches yet</span>}
                      </div>
                    </td>
                    <td className="p-4">
                      <button 
                        onClick={() => { setActiveTab('SUGGESTIONS'); setSugForm({...sugForm, targetUserEmail: user.email}); }}
                        className="p-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-xl transition-all"
                        title="Send Targeted Tip"
                      >
                        <Target className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'SUGGESTIONS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 bg-slate-900/50 border border-slate-800 p-6 rounded-3xl h-fit">
            <h3 className="font-bold text-white mb-6 flex items-center gap-2"><Lightbulb className="h-5 w-5 text-emerald-400" /> {sugForm.targetUserEmail ? 'Targeted Pro Tip' : 'Public Pro Tip'}</h3>
            <form onSubmit={handleAddSuggestion} className="space-y-4">
              {sugForm.targetUserEmail && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl mb-4 flex items-center justify-between">
                  <div className="text-[10px] text-emerald-400 font-bold uppercase">Targeting: {sugForm.targetUserEmail}</div>
                  <button type="button" onClick={() => setSugForm({...sugForm, targetUserEmail: ''})} className="text-emerald-400"><X className="h-3 w-3"/></button>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <Input label="Symbol" val={sugForm.symbol} onChange={(v: string) => setSugForm({...sugForm, symbol: v.toUpperCase()})} />
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Action</label>
                  <select value={sugForm.action} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSugForm({...sugForm, action: e.target.value as any})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white">
                    <option value="BUY">BUY</option><option value="SELL">SELL</option><option value="HOLD">HOLD</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Target (₹)" type="number" val={sugForm.target} onChange={(v: string) => setSugForm({...sugForm, target: Number(v)})} />
                <Input label="Stop Loss (₹)" type="number" val={sugForm.stopLoss} onChange={(v: string) => setSugForm({...sugForm, stopLoss: Number(v)})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Rationale</label>
                <textarea value={sugForm.reason} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSugForm({...sugForm, reason: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white h-24" />
              </div>
              <button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2">
                <Send className="h-4 w-4" /> {sugForm.targetUserEmail ? 'Push Targeted Tip' : 'Publish Tip'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <h3 className="font-bold text-white flex items-center gap-2">Live Suggestions ({suggestions.length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {suggestions.map((sug: ManualSuggestion) => (
                <div key={sug.id} className="bg-slate-900 border border-slate-800 p-4 rounded-3xl">
                  <div className="flex justify-between">
                    <div className="flex items-center gap-2 font-bold text-white text-lg">{sug.symbol} <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">{sug.action}</span></div>
                    <button onClick={() => { deleteManualSuggestion(sug.id); setSuggestions(getManualSuggestions()); }} className="text-slate-600 hover:text-rose-500"><Trash2 className="h-4 w-4"/></button>
                  </div>
                  {sug.targetUserEmail && <div className="text-[9px] text-blue-400 font-bold uppercase mt-1">Exclusive to: {sug.targetUserEmail}</div>}
                  <div className="mt-3 flex gap-4 text-xs font-mono">
                    <div className="text-slate-500">TGT: <span className="text-white">₹{sug.target}</span></div>
                    <div className="text-slate-500">SL: <span className="text-white">₹{sug.stopLoss}</span></div>
                  </div>
                  <p className="text-xs text-slate-400 mt-2 line-clamp-2 italic">"{sug.reason}"</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ADS' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl">
            <h3 className="font-bold text-white mb-6 flex items-center gap-2"><Megaphone className="h-5 w-5 text-orange-400" /> New Ad Campaign</h3>
            <form onSubmit={handleAddAd} className="space-y-4">
              <Input label="Ad Title" val={adForm.title} onChange={(v: string) => setAdForm({...adForm, title: v})} />
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Description</label>
                <textarea value={adForm.description} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAdForm({...adForm, description: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white h-24" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Button Label" val={adForm.ctaText} onChange={(v: string) => setAdForm({...adForm, ctaText: v})} />
                <Input label="Destination URL" type="url" val={adForm.link} onChange={(v: string) => setAdForm({...adForm, link: v})} />
              </div>
              <button className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-orange-900/40">Launch Ad</button>
            </form>
          </div>
          <div className="space-y-4">
            <h3 className="font-bold text-white mb-2">Active Ads ({ads.length})</h3>
            {ads.map((ad: ManualAd) => (
              <div key={ad.id} className="bg-slate-900 border border-slate-800 p-4 rounded-3xl flex justify-between">
                <div><h4 className="font-bold text-white">{ad.title}</h4><p className="text-xs text-slate-500 mt-1">{ad.description}</p></div>
                <button onClick={() => { deleteManualAd(ad.id); setAds(getManualAds()); }} className="text-slate-600 hover:text-rose-500"><Trash2 className="h-4 w-4"/></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface StatCardProps {
  label: string;
  val: string | number;
  icon: React.ElementType;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, val, icon: Icon, color }) => (
  <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl backdrop-blur-sm">
    <div className="flex items-center justify-between mb-2">
      <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{label}</span>
      <Icon className={`h-5 w-5 text-${color}-500`} />
    </div>
    <div className="text-3xl font-bold text-white">{val}</div>
  </div>
);

const RecentActivity: React.FC<{ logs: ActivityLog[] }> = ({ logs }) => (
  <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden">
    <div className="p-4 border-b border-slate-800 font-bold text-white flex items-center gap-2"><Activity className="h-4 w-4 text-blue-400" /> Traffic Intelligence</div>
    <table className="w-full text-left text-xs text-slate-400">
      <thead className="bg-slate-950/50 text-slate-500 uppercase font-bold text-[9px]">
        <tr><th className="p-4">Time</th><th className="p-4">User</th><th className="p-4">Action</th><th className="p-4">Loc</th></tr>
      </thead>
      <tbody className="divide-y divide-slate-800">
        {logs.map((log: ActivityLog) => (
          <tr key={log.id} className="hover:bg-white/5">
            <td className="p-4 font-mono">{new Date(log.timestamp).toLocaleTimeString()}</td>
            <td className="p-4 text-white font-medium">{log.email}</td>
            <td className="p-4"><span className={`px-2 py-0.5 rounded-[4px] font-bold ${log.action === 'LOGIN' ? 'text-emerald-400 bg-emerald-500/10' : 'text-blue-400 bg-blue-500/10'}`}>{log.details}</span></td>
            <td className="p-4 text-slate-500">{log.location?.city || 'N/A'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

interface InputProps {
  label: string;
  val: string | number;
  onChange: (val: string) => void;
  type?: string;
}

const Input: React.FC<InputProps> = ({ label, val, onChange, type = 'text' }) => (
  <div className="space-y-1">
    <label className="text-[10px] font-bold text-slate-500 uppercase">{label}</label>
    <input 
      type={type} 
      value={val} 
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)} 
      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-blue-500 transition-all" 
    />
  </div>
);

export default AdminDashboard;
