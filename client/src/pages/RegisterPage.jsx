import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Store, Mail, Lock, Building, Phone, MapPin, ArrowRight } from 'lucide-react';

export default function RegisterPage({ onLoginClick, onRegisterSuccess }) {
  const { register, loading } = useAuth();
  const [role, setRole] = useState('buyer');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    businessName: '',
    phone: '',
    address: 'RS Puram, Coimbatore',
    longitude: 76.9558,
    latitude: 11.0168,
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await register({
        ...formData,
        role,
        coordinates: [parseFloat(formData.longitude), parseFloat(formData.latitude)],
      });
      if (onRegisterSuccess) onRegisterSuccess();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-lg mx-auto bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-black text-slate-900">Join FreshCart Network</h2>
        <p className="text-xs text-slate-500 mt-1">
          Select whether you are purchasing produce or supplying fresh farm goods.
        </p>
      </div>

      {/* Role Picker */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setRole('buyer')}
          className={`p-3 rounded-2xl border-2 text-left transition flex flex-col justify-between ${
            role === 'buyer'
              ? 'border-emerald-600 bg-emerald-50/60 text-emerald-950 font-bold'
              : 'border-slate-200 hover:border-slate-300 text-slate-600'
          }`}
        >
          <User className="w-5 h-5 text-emerald-600 mb-2" />
          <div>
            <div className="text-xs font-black">Restaurant Buyer</div>
            <div className="text-[10px] text-slate-500 font-normal">Hotels, cafes, catering & food businesses</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setRole('vendor')}
          className={`p-3 rounded-2xl border-2 text-left transition flex flex-col justify-between ${
            role === 'vendor'
              ? 'border-emerald-600 bg-emerald-50/60 text-emerald-950 font-bold'
              : 'border-slate-200 hover:border-slate-300 text-slate-600'
          }`}
        >
          <Store className="w-5 h-5 text-emerald-600 mb-2" />
          <div>
            <div className="text-xs font-black">Farmer / Producer</div>
            <div className="text-[10px] text-slate-500 font-normal">Growers, dairies, and wholesale suppliers</div>
          </div>
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3 text-xs">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Full Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Anand Gowda"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
          <div>
            <label className="font-bold text-slate-700 block mb-1">Business Name</label>
            <input
              type="text"
              required
              placeholder={role === 'buyer' ? 'e.g. Basil Bistro' : 'e.g. Gowda Organic Farm'}
              value={formData.businessName}
              onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Email</label>
            <input
              type="email"
              required
              placeholder="contact@business.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
          <div>
            <label className="font-bold text-slate-700 block mb-1">Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
        </div>

        <div>
          <label className="font-bold text-slate-700 block mb-1">Address / Locality</label>
          <input
            type="text"
            required
            placeholder="Street address or Farmland district"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
          />
        </div>

        {role === 'vendor' && (
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
            <label className="font-bold text-slate-800 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              GeoJSON Point Coordinates for 20km Discovery:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-500">Longitude [X]</span>
                <input
                  type="number"
                  step="any"
                  required
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-500">Latitude [Y]</span>
                <input
                  type="number"
                  step="any"
                  required
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 rounded-xl text-xs transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5"
        >
          {loading ? 'Creating Account...' : `Register as ${role === 'buyer' ? 'Restaurant Buyer' : 'Producer'}`}
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
        Already have an account?{' '}
        <button
          onClick={onLoginClick}
          className="font-bold text-emerald-700 hover:text-emerald-800"
        >
          Sign In
        </button>
      </div>
    </div>
  );
}
