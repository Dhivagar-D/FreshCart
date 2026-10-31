import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, ArrowRight, Sparkles } from 'lucide-react';

export default function LoginPage({ onRegisterClick, onLoginSuccess }) {
  const { login, loading, switchDemoRole } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      if (onLoginSuccess) onLoginSuccess();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6">
      <div className="text-center">
        <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
          <span className="text-2xl">🥬</span>
        </div>
        <h2 className="text-2xl font-black text-slate-900">Sign in to FreshCart</h2>
        <p className="text-xs text-slate-500 mt-1">B2B Hyperlocal Farm-to-Restaurant Marketplace</p>
      </div>

      {/* 1-Click Fast Fill Personas */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs space-y-2">
        <span className="font-bold text-slate-700 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          Test Account One-Click Fill:
        </span>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => {
              setEmail('buyer@freshcart.local');
              setPassword('password123');
            }}
            className="p-1.5 bg-white border border-slate-200 rounded-lg hover:border-emerald-500 font-semibold text-slate-700 text-center"
          >
            Buyer
          </button>
          <button
            type="button"
            onClick={() => {
              setEmail('anand@farmfresh.local');
              setPassword('password123');
            }}
            className="p-1.5 bg-white border border-slate-200 rounded-lg hover:border-emerald-500 font-semibold text-slate-700 text-center"
          >
            Vendor
          </button>
          <button
            type="button"
            onClick={() => {
              setEmail('admin@freshcart.local');
              setPassword('admin123');
            }}
            className="p-1.5 bg-white border border-slate-200 rounded-lg hover:border-emerald-500 font-semibold text-slate-700 text-center"
          >
            Admin
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="font-bold text-slate-700 block mb-1">Email Address</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="chef@restaurant.com"
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>

        <div>
          <label className="font-bold text-slate-700 block mb-1">Password</label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 rounded-xl text-xs transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5"
        >
          {loading ? 'Authenticating...' : 'Sign In to Marketplace'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
        Don't have an account?{' '}
        <button
          onClick={onRegisterClick}
          className="font-bold text-emerald-700 hover:text-emerald-800"
        >
          Create Restaurant or Vendor Account
        </button>
      </div>
    </div>
  );
}
