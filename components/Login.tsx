import React, { useState, useEffect } from 'react';
import { 
  Mail, RefreshCw, ArrowRight, ShieldCheck, KeyRound, Server, X, MapPin, 
  UserCog, UserPlus, Phone, Briefcase, Landmark, Building2, User 
} from 'lucide-react';
import { UserLocation, UserProfile } from '../types';
import { saveUserProfile, getUserProfile } from '../services/adminDataService';

interface LoginProps {
  onLoginSuccess: (email: string, location: UserLocation | null) => void;
  onAdminClick: () => void;
}

const PROFESSIONS = [
  'Engineer', 'Doctor', 'Teacher', 'Student', 'Entrepreneur', 
  'Finance Professional', 'IT Consultant', 'Marketing Expert', 
  'Law Professional', 'Government Employee', 'Artist', 
  'Retired', 'Homemaker', 'Self Employed', 'Other'
];

const Login: React.FC<LoginProps> = ({ onLoginSuccess, onAdminClick }) => {
  const [view, setView] = useState<'LOGIN' | 'SIGNUP' | 'OTP'>('LOGIN');
  const [email, setEmail] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [generatedCaptcha, setGeneratedCaptcha] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [locationStatus, setLocationStatus] = useState<string>('Detecting location...');

  // Sign Up States
  const [signUpData, setSignUpData] = useState({
    name: '',
    mobile: '',
    city: '',
    profession: PROFESSIONS[0]
  });

  // Mock Mail Server State
  const [showMockServer, setShowMockServer] = useState(false);
  const [mockEmails, setMockEmails] = useState<Array<{to: string, code: string, time: string}>>([]);

  const generateCaptcha = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setGeneratedCaptcha(result);
  };

  useEffect(() => {
    generateCaptcha();
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLocationStatus(`Lat: ${position.coords.latitude.toFixed(4)}, Lng: ${position.coords.longitude.toFixed(4)}`);
        },
        () => setLocationStatus("Location access denied")
      );
    }
  }, []);

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Check if user exists if in LOGIN view
    if (view === 'LOGIN') {
      const existingUser = getUserProfile(email);
      if (!existingUser) {
        setError('No account found with this email. Please Sign Up first.');
        return;
      }
    }

    if (captchaInput.toUpperCase() !== generatedCaptcha) {
      setError('Incorrect CAPTCHA. Please try again.');
      generateCaptcha();
      setCaptchaInput('');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(otp);
      setMockEmails(prev => [{
        to: email,
        code: otp,
        time: new Date().toLocaleTimeString()
      }, ...prev]);
      setShowMockServer(true);
      setIsLoading(false);
      setView('OTP');
    }, 1200);
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (captchaInput.toUpperCase() !== generatedCaptcha) {
      setError('Incorrect CAPTCHA. Please try again.');
      generateCaptcha();
      setCaptchaInput('');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const newProfile: UserProfile = {
        ...signUpData,
        email,
        joinedAt: Date.now()
      };
      saveUserProfile(newProfile);
      
      // Proceed to OTP immediately
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(otp);
      setMockEmails(prev => [{
        to: email,
        code: otp,
        time: new Date().toLocaleTimeString()
      }, ...prev]);
      setShowMockServer(true);
      setIsLoading(false);
      setView('OTP');
    }, 1500);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (otpInput === generatedOtp) {
      setIsLoading(true);
      setTimeout(() => {
        onLoginSuccess(email, location);
      }, 1000);
    } else {
      setError('Invalid OTP. Check Mock Mail Server.');
    }
  };

  const startFresh = () => {
    setView('LOGIN');
    setError('');
    setOtpInput('');
    generateCaptcha();
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-md mx-auto animate-in fade-in zoom-in duration-500">
      <div className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-slate-900/50 rounded-full border border-slate-800 text-xs text-slate-400 mb-2">
        <MapPin className="h-3 w-3 text-blue-500" />
        <span>{locationStatus}</span>
      </div>

      <div className="w-full bg-slate-900/80 p-8 rounded-3xl border border-slate-800 shadow-2xl backdrop-blur-md relative overflow-hidden">
        <button 
          onClick={onAdminClick}
          className="absolute top-4 right-4 p-2 text-slate-600 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
          title="Admin Login"
        >
          <UserCog className="h-4 w-4" />
        </button>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-blue-500/10 rounded-2xl mb-4 ring-1 ring-blue-500/50">
            {view === 'SIGNUP' ? <UserPlus className="h-8 w-8 text-blue-400" /> : <ShieldCheck className="h-8 w-8 text-blue-400" />}
          </div>
          <h2 className="text-2xl font-bold text-white">
            {view === 'LOGIN' ? 'Secure Login' : view === 'SIGNUP' ? 'Create Account' : 'Verify Identity'}
          </h2>
          <p className="text-slate-400 text-sm mt-2">
            {view === 'OTP' ? `Code sent to ${email}` : 'Join the smarter way to track stocks'}
          </p>
        </div>

        {view === 'LOGIN' && (
          <form onSubmit={handleSendOtp} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Email</label>
              <div className="relative group">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-slate-950 text-white pl-10 pr-4 py-3 rounded-xl border border-slate-800 focus:border-blue-500 outline-none transition-all"
                  required
                />
              </div>
            </div>

            <CaptchaSection 
              generatedCaptcha={generatedCaptcha} 
              captchaInput={captchaInput} 
              onCaptchaChange={setCaptchaInput} 
              onRegenerate={generateCaptcha} 
            />

            {error && <p className="text-rose-400 text-xs text-center">{error}</p>}

            <button disabled={isLoading} className="w-full py-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-900/30 transition-all active:scale-95">
              {isLoading ? 'Verifying...' : 'Continue to Login'}
            </button>
            <div className="text-center mt-4">
              <button type="button" onClick={() => { setView('SIGNUP'); setError(''); }} className="text-xs text-slate-500 hover:text-blue-400">
                Don't have an account? <span className="font-bold text-blue-400 underline">Sign Up</span>
              </button>
            </div>
          </form>
        )}

        {view === 'SIGNUP' && (
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Full Name</label>
                <div className="relative group">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500 group-focus-within:text-blue-400" />
                  <input
                    type="text"
                    value={signUpData.name}
                    onChange={(e) => setSignUpData({...signUpData, name: e.target.value})}
                    className="w-full bg-slate-950 text-white pl-9 pr-3 py-2.5 rounded-xl border border-slate-800 focus:border-blue-500 outline-none text-sm"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Mobile No.</label>
                <div className="relative group">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-500 group-focus-within:text-blue-400" />
                  <input
                    type="tel"
                    value={signUpData.mobile}
                    onChange={(e) => setSignUpData({...signUpData, mobile: e.target.value})}
                    className="w-full bg-slate-950 text-white pl-9 pr-3 py-2.5 rounded-xl border border-slate-800 focus:border-blue-500 outline-none text-sm"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500 group-focus-within:text-blue-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 text-white pl-9 pr-3 py-2.5 rounded-xl border border-slate-800 focus:border-blue-500 outline-none text-sm"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">City</label>
                <div className="relative group">
                  <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-500 group-focus-within:text-blue-400" />
                  <input
                    type="text"
                    value={signUpData.city}
                    onChange={(e) => setSignUpData({...signUpData, city: e.target.value})}
                    className="w-full bg-slate-950 text-white pl-9 pr-3 py-2.5 rounded-xl border border-slate-800 focus:border-blue-500 outline-none text-sm"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Profession</label>
                <div className="relative group">
                  <Briefcase className="absolute left-3 top-2.5 h-4 w-4 text-slate-500 group-focus-within:text-blue-400" />
                  <select
                    value={signUpData.profession}
                    onChange={(e) => setSignUpData({...signUpData, profession: e.target.value})}
                    className="w-full bg-slate-950 text-white pl-9 pr-3 py-2.5 rounded-xl border border-slate-800 focus:border-blue-500 outline-none text-sm appearance-none"
                  >
                    {PROFESSIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <CaptchaSection 
              generatedCaptcha={generatedCaptcha} 
              captchaInput={captchaInput} 
              onCaptchaChange={setCaptchaInput} 
              onRegenerate={generateCaptcha} 
            />

            {error && <p className="text-rose-400 text-xs text-center">{error}</p>}

            <button disabled={isLoading} className="w-full py-4 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-900/30 transition-all active:scale-95">
              {isLoading ? 'Saving...' : 'Register & Verify Email'}
            </button>
            <div className="text-center mt-2">
              <button type="button" onClick={() => { setView('LOGIN'); setError(''); }} className="text-xs text-slate-500 hover:text-white">
                Back to Login
              </button>
            </div>
          </form>
        )}

        {view === 'OTP' && (
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">One-Time Password</label>
              <div className="relative group">
                <KeyRound className="absolute left-3 top-3 h-5 w-5 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
                <input
                  type="text"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  placeholder="6-digit code"
                  maxLength={6}
                  className="w-full bg-slate-950 text-white pl-10 pr-4 py-4 rounded-xl border border-slate-800 focus:border-emerald-500 outline-none text-lg tracking-[0.5em] font-mono font-bold text-center"
                  required
                />
              </div>
            </div>

            {error && <p className="text-rose-400 text-xs text-center">{error}</p>}

            <button disabled={isLoading} className="w-full py-4 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-900/30 transition-all active:scale-95">
              {isLoading ? 'Confirming...' : 'Complete Authentication'}
            </button>
            <button type="button" onClick={startFresh} className="w-full text-xs text-slate-500 hover:text-white">
              Cancel & Start Over
            </button>
          </form>
        )}
      </div>

      {showMockServer && (
        <div className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-2xl animate-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Server className="h-3 w-3" /> Virtual Email Server
            </span>
            <button onClick={() => setShowMockServer(false)} className="text-slate-600 hover:text-white"><X className="h-4 w-4" /></button>
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
            {mockEmails.map((mail, idx) => (
              <div key={idx} className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-[11px] font-mono">
                <div className="flex justify-between text-slate-500 mb-1">
                  <span>To: {mail.to}</span>
                  <span>{mail.time}</span>
                </div>
                <div className="text-slate-300">Code: <span className="text-emerald-400 font-bold select-all">{mail.code}</span></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const CaptchaSection = ({ generatedCaptcha, captchaInput, onCaptchaChange, onRegenerate }: any) => (
  <div className="space-y-2">
    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Security Check</label>
    <div className="flex gap-3">
      <div className="flex-1 bg-slate-800 border border-slate-700 rounded-xl flex items-center justify-center relative overflow-hidden select-none min-h-[48px]">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 0)', backgroundSize: '10px 10px' }} />
        <span className="text-xl font-mono font-black tracking-widest text-slate-200" style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.5)' }}>
          {generatedCaptcha}
        </span>
        <button type="button" onClick={onRegenerate} className="absolute right-2 p-1.5 hover:bg-slate-700 rounded-lg text-slate-500 hover:text-white transition-colors">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>
      <input
        type="text"
        value={captchaInput}
        onChange={(e) => onCaptchaChange(e.target.value.toUpperCase())}
        placeholder="Type Above"
        className="w-1/2 bg-slate-950 text-white px-4 rounded-xl border border-slate-800 focus:border-blue-500 outline-none text-sm font-bold"
        required
      />
    </div>
  </div>
);

export default Login;