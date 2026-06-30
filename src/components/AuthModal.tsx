import React, { useState } from 'react';

interface AuthModalProps {
  onAuthSuccess: (token: string, username: string, isFirstLogin?: boolean) => void;
}

export default function AuthModal({ onAuthSuccess }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please fill out all fields.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const endpoint = isLogin ? '/login' : '/signup';
      const body = isLogin 
        ? new URLSearchParams({ username, password }).toString() // OAuth2 form compatibility
        : JSON.stringify({ username, password });

      const headers: HeadersInit = isLogin 
        ? { 'Content-Type': 'application/x-www-form-urlencoded' }
        : { 'Content-Type': 'application/json' };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      if (isLogin) {
        onAuthSuccess(data.access_token, username, data.is_first_login);
      } else {
        // After signup, switch to login or auto-login.
        setError('Signup successful! Please log in to your account.');
        setIsLogin(true);
        setPassword('');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#008080] flex items-center justify-center p-4 z-50 select-none font-pixel text-sm">
      {/* Background windows pattern decoration */}
      <div className="absolute top-4 left-4 text-[#80cbc4] opacity-20 text-[10vw] font-bold tracking-widest leading-none pointer-events-none uppercase">
        TASK BUDDY 95
      </div>

      <div className="w-full max-w-sm p-[3px] bg-[#c0c0c0] border-2 border-t-[#ffffff] border-l-[#ffffff] border-r-[#000000] border-b-[#000000] shadow-2xl">
        {/* Title bar */}
        <div className="bg-[#000080] p-1 flex items-center justify-between text-white font-bold">
          <span className="tracking-wider flex items-center gap-1.5">
            <div className="w-4 h-4 bg-[#c0c0c0] border-inset flex items-center justify-center">
              <div className="w-2 h-2 bg-[#000080]"></div>
            </div>
            <span>Setup - Task Buddy 95</span>
          </span>
          <div className="w-4 h-4 bg-[#c0c0c0] border-outset flex items-center justify-center text-black text-xs font-bold font-pixel active:border-inset">
            X
          </div>
        </div>

        {/* Info Area (Gray container with Windows logo style banner) */}
        <div className="flex gap-3 bg-gray-300 p-3 border-b border-[#808080]">
          <div className="w-12 h-12 bg-[#000080] border-inset flex items-center justify-center text-2xl text-yellow-400 font-bold shrink-0">
            💽
          </div>
          <div>
            <h2 className="text-base font-bold text-black tracking-wide">
              {isLogin ? 'Welcome to Task Buddy 95' : 'Create New User Account'}
            </h2>
            <p className="text-xs text-gray-700 leading-tight mt-0.5">
              {isLogin 
                ? 'Type your credentials to initialize retro productivity with synchronized lists and custom AI assistance.'
                : 'Enter a username and password to create a secure personal workspace.'}
            </p>
          </div>
        </div>

        {/* Main form */}
        <form onSubmit={handleSubmit} className="p-3 flex flex-col gap-3">
          {error && (
            <div className="p-1 border-2 border-red-700 bg-red-100 text-red-900 text-xs flex gap-2 items-center">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col gap-0.5">
            <label className="text-black font-bold tracking-wide">Username:</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="px-2 py-1 border-inset bg-white text-black text-sm font-pixel outline-hidden"
              placeholder="e.g. retro_user"
              autoFocus
              disabled={loading}
            />
          </div>

          <div className="flex flex-col gap-0.5">
            <label className="text-black font-bold tracking-wide">Password:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="px-2 py-1 border-inset bg-white text-black text-sm font-pixel outline-hidden"
              placeholder="••••••••"
              disabled={loading}
            />
          </div>

          {/* Buttons container */}
          <div className="flex items-center justify-between mt-2.5">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
                setUsername('');
                setPassword('');
              }}
              className="text-blue-900 underline text-xs hover:text-blue-600 cursor-pointer"
            >
              {isLogin ? "Need an account? Sign up" : "Already have an account? Log in"}
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 bg-[#c0c0c0] font-bold border-outset cursor-pointer select-none active:border-inset text-sm"
            >
              {loading ? 'Wait...' : isLogin ? 'Log In' : 'Sign Up'}
            </button>
          </div>
        </form>

        {/* Technical Footer */}
        <div className="px-2 py-1 bg-gray-300 text-gray-600 text-[11px] text-right border-t border-[#808080] select-none">
          SYSTEM_VERSION: 1.0.95 • EMULATOR_OK
        </div>
      </div>
    </div>
  );
}

