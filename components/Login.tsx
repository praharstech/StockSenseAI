import React, { useState, useEffect } from 'react';
import { Mail, RefreshCw, ArrowRight, ShieldCheck, KeyRound, Server, X, MapPin, UserCog } from 'lucide-react';
import { UserLocation } from '../types';

interface LoginProps {
  onLoginSuccess: (email: string, location: UserLocation | null) => void;
  onAdminClick: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess, onAdminClick }) => {
  const [step, setStep] = useState<1 | 2>(1); // 1: Email/Captcha, 2: OTP
  const [email, setEmail] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [generatedCaptcha, setGeneratedCaptcha] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [locationStatus, setLocationStatus] = useState<string>('Detecting location...');

  // Mock Mail Server State
  const [showMockServer, setShowMockServer] = useState(false);
  const [mockEmails, setMockEmails] = useState<Array<{to: string, code: string, time: string}>>([]);

  // Generate a random 6-character alphanumeric CAPTCHA
  const generateCaptcha = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded similar chars like I, 1, O, 0
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setGeneratedCaptcha(result);
  };

  useEffect(() => {
    generateCaptcha();
    
    // Fetch Geolocation on mount
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLocationStatus(`Lat: ${position.coords.latitude.toFixed(4)}, Lng: ${position.coords.longitude.toFixed(4)}`);
        },
        (error) => {
          console.error("Geo Error", error);
          setLocationStatus("Location access denied");
        }
      );
    } else {
      setLocationStatus("Geolocation not supported");
    }
  }, []);

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (captchaInput.toUpperCase() !== generatedCaptcha) {
      setError('Incorrect CAPTCHA. Please try again.');
      generateCaptcha();
      setCaptchaInput('');
      return;
    }

    setIsLoading(true);

    // Simulate API delay
    setTimeout(() => {
      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(otp);
      
      // SIMULATION: Add to mock inbox instead of alert
      const newEmail = {
        to: email,
        code: otp,
        time: new Date().toLocaleTimeString()
      };
      setMockEmails(prev => [newEmail, ...prev]);
      setShowMockServer(true); // Open the mock server panel
      
      setIsLoading(false);
      setStep(2);
    }, 1500);
  };

  const handleChangeEmail = () => {
    setStep(1);
    setError('');
    setOtpInput('');
    setGeneratedOtp('');
    generateCaptcha(); // Regenerate CAPTCHA for security when restarting flow
    // We do NOT clear the email state here, allowing the user to correct it if needed.
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
      setError('Invalid OTP. Please check the mock server and try again.');
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-md mx-auto animate-in fade-in zoom-in duration-500">
      
      {/* Location Status Bar */}
      <div className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-slate-900/50 rounded-full border border-slate-800 text-xs text-slate-400 mb-2">
        <MapPin className="h-3 w-3 text-blue-500" />
        <span>{locationStatus}</span>
      </div>

      {/* Main Login Card */}
      <div className="w-full bg-slate-900/80 p-8 rounded-2xl border border-slate-800 shadow-2xl backdrop-blur-md relative overflow-hidden">
        {/* Admin Link */}
        <button 
          onClick={onAdminClick}
          className="absolute top-4 right-4 p-2 text-slate-600 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
          title="Admin Login"
        >
          <UserCog className="h-4 w-4" />
        </button>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-blue-500/10 rounded-full mb-4 ring-1 ring-blue-500/50">
            <ShieldCheck className="h-8 w-8 text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-white">
            {step === 1 ? 'Secure Login' : 'Verify Identity'}
          </h2>
          <p className="text-slate-400 text-sm mt-2">
            {step === 1 
              ? 'Enter your email to receive a login code' 
              : `Enter the code sent to ${email}`}
          </p>
        </div>

        {step === 1 ? (
          <form onSubmit={handleSendOtp} className="space-y-5">
            {/* Email Input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 ml-1">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-slate-950 text-white pl-10 pr-4 py-3 rounded-xl border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600"
                  required
                />
              </div>
            </div>

            {/* CAPTCHA Section */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 ml-1">Security Check</label>
              <div className="flex gap-3">
                <div 
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl flex items-center justify-center relative overflow-hidden select-none"
                  style={{ backgroundImage: 'linear-gradient(45deg, #1e293b 25%, transparent 25%, transparent 75%, #1e293b 75%, #1e293b), linear-gradient(45deg, #1e293b 25%, transparent 25%, transparent 75%, #1e293b 75%, #1e293b)', backgroundSize: '10px 10px', backgroundPosition: '0 0, 5px 5px' }}
                >
                  <span className="text-2xl font-mono font-bold tracking-widest text-slate-200" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
                    {generatedCaptcha}
                  </span>
                  <button 
                    type="button" 
                    onClick={generateCaptcha}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-700 rounded-full transition-colors text-slate-400 hover:text-white"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>
                <input
                  type="text"
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value)}
                  placeholder="Enter CAPTCHA"
                  className="w-1/2 bg-slate-950 text-white px-4 py-3 rounded-xl border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all uppercase placeholder:normal-case placeholder:text-slate-600"
                  required
                />
              </div>
            </div>

            {error && <p className="text-rose-400 text-xs text-center">{error}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3.5 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 ${
                isLoading
                  ? 'bg-slate-700 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500'
              }`}
            >
              {isLoading ? 'Sending...' : 'Request Login Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 ml-1">One-Time Password</label>
              <div className="relative group">
                <KeyRound className="absolute left-3 top-3 h-5 w-5 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
                <input
                  type="text"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  className="w-full bg-slate-950 text-white pl-10 pr-4 py-3 rounded-xl border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-600 tracking-widest font-mono text-lg"
                  required
                />
              </div>
            </div>

            {error && <p className="text-rose-400 text-xs text-center">{error}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3.5 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 ${
                isLoading
                  ? 'bg-slate-700 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500'
              }`}
            >
              {isLoading ? (
                <div className="h-5 w-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Login <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
            
            <button 
              type="button"
              onClick={handleChangeEmail}
              className="w-full text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              Change Email
            </button>
          </form>
        )}
      </div>

      {/* Mock Mail Server Panel */}
      {showMockServer && (
        <div className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 animate-in slide-in-from-bottom-2 shadow-2xl">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2 text-slate-400">
              <Server className="h-4 w-4" />
              <span className="text-xs font-mono uppercase tracking-wider font-bold">Mock Mail Server (Local)</span>
            </div>
            <button onClick={() => setShowMockServer(false)} className="text-slate-500 hover:text-slate-300 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
            {mockEmails.length === 0 ? (
               <div className="text-center text-slate-600 text-xs py-4">Inbox Empty</div>
            ) : (
              mockEmails.map((mail, idx) => (
                <div key={idx} className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-sm font-mono hover:border-slate-700 transition-colors">
                  <div className="text-slate-500 text-[10px] flex justify-between mb-1">
                    <span>To: {mail.to}</span>
                    <span>{mail.time}</span>
                  </div>
                  <div className="text-slate-300">
                    Your Login OTP is: <span className="font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded ml-1 select-all">{mail.code}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Toggle Button for Mock Server if closed */}
      {!showMockServer && mockEmails.length > 0 && (
         <button 
           onClick={() => setShowMockServer(true)}
           className="flex items-center gap-2 text-xs text-slate-500 hover:text-blue-400 transition-colors bg-slate-900/50 px-4 py-2 rounded-full border border-slate-800 hover:border-blue-500/30"
         >
           <Server className="h-3 w-3" /> Re-open Mock Inbox
         </button>
      )}
    </div>
  );
};

export default Login;