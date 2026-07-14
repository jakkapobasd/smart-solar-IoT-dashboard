import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Zap, User, Lock, Loader2 } from 'lucide-react';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setPending(true);
    try {
      await login({ username, password });
      navigate('/');
    } catch (err: any) {
      if (err.response && err.response.status >= 500) {
        setError('A server error occurred. Please try again later.');
        return;
      }
      // Handle the case where err.response?.data?.detail is an array or object
      const errorDetail = err.response?.data?.detail;
      let errorMessage = 'Login failed. Please check your credentials.';

      if (typeof errorDetail === 'string') {
        errorMessage = errorDetail;
      } else if (Array.isArray(errorDetail)) {
        // Pydantic validation errors are usually arrays of objects: [{msg: '...', ...}]
        errorMessage = errorDetail.map(e => e.msg || JSON.stringify(e)).join(', ');
      } else if (errorDetail && typeof errorDetail === 'object') {
        errorMessage = errorDetail.message || errorDetail.msg || JSON.stringify(errorDetail);
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setPending(false);
    }
  };

  return (
    <div 
      id="login-page-container"
      className="h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-950 relative overflow-hidden p-4"
      style={{
        backgroundImage: 'url(/images/bg_login_lekise.png)',
        backgroundSize: '100% 100%',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <div 
        id="login-card" 
        className="w-full max-w-[360px] bg-white/15 dark:bg-slate-900/20 backdrop-blur-lg border border-white/30 rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-500 relative"
      >
        <div className="flex flex-col items-center mb-6">
          <div id="login-logo-container" className="h-24 w-full flex items-center justify-center mb-3 select-none animate-bounce-short">
            <img 
              id="login-mascot-logo"
              src="/images/lekise-mascot.png" 
              alt="LeKise Mascot" 
              onError={() => setLogoError(true)}
              className="max-h-full w-auto object-contain drop-shadow-xl transition-all duration-300 hover:scale-105"
              referrerPolicy="no-referrer"
            />
          </div>
          <h2 id="login-title" className="text-xl font-bold text-slate-800 dark:text-white tracking-tight text-center">
            Login to your account
          </h2>
          <p id="login-subtitle" className="text-xs text-slate-500 dark:text-slate-400 mt-1">Please enter your credentials</p>
        </div>

        <form id="login-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 ml-1">Username</label>
            <div className="relative group">
              <input 
                id="login-username"
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full bg-slate-50/90 dark:bg-slate-800/90 border border-slate-200/60 dark:border-slate-700 rounded-xl pl-4 pr-10 py-2.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-800 dark:text-white"
                placeholder="Enter username"
              />
              <User className="absolute right-3.5 top-3 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 ml-1">Password</label>
            <div className="relative group">
              <input 
                id="login-password"
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-slate-50/90 dark:bg-slate-800/90 border border-slate-200/60 dark:border-slate-700 rounded-xl pl-4 pr-10 py-2.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-800 dark:text-white"
                placeholder="••••••••"
              />
              <Lock className="absolute right-3.5 top-3 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            </div>
          </div>

          {error && (
            <div id="login-error-container" className="p-3 bg-red-500/10 dark:bg-red-900/20 border border-red-500/20 rounded-xl">
              <p className="text-[11px] font-medium text-red-600 dark:text-red-400 text-center">{error}</p>
            </div>
          )}

          <button 
            id="login-submit-button"
            type="submit" 
            disabled={pending}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center space-x-2 text-xs"
          >
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Sign In</span>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
