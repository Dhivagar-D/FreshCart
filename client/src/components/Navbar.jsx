import React, { useState } from 'react';
import { useAuth, DEMO_BUYER_COORDS } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import {
  MapPin,
  ShoppingBag,
  Store,
  ShieldCheck,
  User,
  LogOut,
  Sparkles,
  Layers,
  FileText,
  Navigation,
  CalendarClock,
} from 'lucide-react';

const PRESET_LOCATIONS = [
  DEMO_BUYER_COORDS,
  {
    name: 'Gandhipuram, Coimbatore',
    latitude: 11.0168,
    longitude: 76.9674,
  },
  {
    name: 'Saibaba Colony, Coimbatore',
    latitude: 11.0292,
    longitude: 76.9442,
  },
  {
    name: 'Coimbatore Rural Outskirts (Test Radius Exclusion)',
    latitude: 11.2200,
    longitude: 77.1200,
  },
];

export default function Navbar({ activeTab, setActiveTab }) {
  const { user, logout, switchDemoRole, buyerLocation, setBuyerLocation, requestCurrentLocation } = useAuth();
  const { cart } = useCart();
  const [showLocMenu, setShowLocMenu] = useState(false);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      {/* Top Banner with Quick Switcher & Geolocation status */}
      <div className="bg-forest-900 text-slate-200 text-xs px-4 py-1.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-medium">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            Hyperlocal B2B Engine Active
          </span>
          <span className="hidden sm:inline text-slate-400">|</span>
          <span className="hidden sm:inline text-slate-300">Enforcing strict 20.0 km radius from buyer</span>
        </div>

        {/* Demo Fast Switcher */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 font-medium">1-Click Test Personas:</span>
          <button
            onClick={async () => {
              await switchDemoRole('buyer');
              setActiveTab('discovery');
            }}
            className={`px-2 py-0.5 rounded text-xs font-semibold transition ${
              user?.role === 'buyer' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Buyer (Restaurant)
          </button>
          <button
            onClick={async () => {
              await switchDemoRole('vendor');
              setActiveTab('vendor-portal');
            }}
            className={`px-2 py-0.5 rounded text-xs font-semibold transition ${
              user?.role === 'vendor' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Vendor (Farmer)
          </button>
          <button
            onClick={async () => {
              await switchDemoRole('admin');
              setActiveTab('admin-portal');
            }}
            className={`px-2 py-0.5 rounded text-xs font-semibold transition ${
              user?.role === 'admin' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Admin (Platform)
          </button>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div
          onClick={() => setActiveTab('discovery')}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-forest-800 to-forest-600 flex items-center justify-center text-white shadow-md shadow-forest-800/20 group-hover:scale-105 transition">
            <span className="text-xl">🥬</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-extrabold tracking-tight text-slate-900">FreshCart</span>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide uppercase">
                B2B Direct
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium -mt-0.5">Farm-to-Kitchen Wholesale</p>
          </div>
        </div>

        {/* Hyperlocal Location Pill */}
        <div className="relative">
          <button
            onClick={() => setShowLocMenu(!showLocMenu)}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200/80 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 transition"
          >
            <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="text-left hidden md:block max-w-[200px] truncate">
              <span className="block text-[10px] text-slate-500 uppercase font-bold tracking-wider">Buyer Location</span>
              <span className="font-medium text-slate-800">{buyerLocation.name}</span>
            </div>
            <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">20km</span>
          </button>

          {/* Location Selector Dropdown */}
          {showLocMenu && (
            <div className="absolute left-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-3 py-1.5 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-800">Set Buyer GPS Coordinates</p>
                <p className="text-[11px] text-slate-500">Radius of 20km is strictly calculated from this point.</p>
              </div>

              <div className="p-2 space-y-1">
                {PRESET_LOCATIONS.map((loc, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setBuyerLocation(loc);
                      setShowLocMenu(false);
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition flex items-start gap-2 ${
                      buyerLocation.name === loc.name
                        ? 'bg-emerald-50 text-emerald-900 font-semibold'
                        : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5 mt-0.5 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-medium">{loc.name}</div>
                      <div className="text-[10px] text-slate-400">
                        [{loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}]
                      </div>
                    </div>
                  </button>
                ))}

                <button
                  onClick={() => {
                    requestCurrentLocation();
                    setShowLocMenu(false);
                  }}
                  className="w-full mt-1.5 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  Use Device Real GPS
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => setActiveTab('discovery')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${
              activeTab === 'discovery'
                ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <MapPin className="w-4 h-4 text-emerald-600" />
            <span>Nearby Vendors</span>
          </button>

          <button
            onClick={() => setActiveTab('catalog')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${
              activeTab === 'catalog'
                ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4 text-emerald-600" />
            <span>Produce Catalog</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${
              activeTab === 'orders'
                ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Orders & Invoices</span>
            <span className="sm:hidden">Orders</span>
          </button>

          {user?.role === 'buyer' && (
            <button onClick={() => setActiveTab('scheduled-orders')} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${activeTab === 'scheduled-orders' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}>
              <CalendarClock className="w-4 h-4 text-emerald-600" />
              <span className="hidden md:inline">Schedules</span>
            </button>
          )}

          {/* Cart with Multi-Vendor Badge */}
          {user?.role === 'buyer' && <button
            onClick={() => setActiveTab('cart')}
            className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${
              activeTab === 'cart'
                ? 'bg-emerald-700 text-white font-bold'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Cart</span>
            {cart?.totalItemsCount > 0 && (
              <span className="bg-amber-400 text-slate-950 text-xs font-extrabold w-5 h-5 rounded-full flex items-center justify-center ml-0.5">
                {cart.totalItemsCount}
              </span>
            )}
          </button>}

          {/* Role specific portals */}
          {user?.role === 'vendor' && (
            <button
              onClick={() => setActiveTab('vendor-portal')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold border ${
                activeTab === 'vendor-portal'
                  ? 'bg-forest-900 text-white border-forest-900'
                  : 'bg-slate-50 text-slate-800 border-slate-300 hover:bg-slate-100'
              }`}
            >
              <Store className="w-4 h-4 text-emerald-500" />
              <span>Vendor Portal</span>
            </button>
          )}

          {user?.role === 'admin' && (
            <button
              onClick={() => setActiveTab('admin-portal')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold border ${
                activeTab === 'admin-portal'
                  ? 'bg-purple-900 text-white border-purple-900'
                  : 'bg-slate-50 text-slate-800 border-slate-300 hover:bg-slate-100'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-purple-500" />
              <span>Admin Console</span>
            </button>
          )}

          {/* User / Auth */}
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="hidden lg:block text-right">
                <div className="text-xs font-bold text-slate-900 leading-tight">{user.name}</div>
                <div className="text-[10px] text-emerald-700 font-semibold capitalize">{user.role}</div>
              </div>
              <button
                onClick={logout}
                title="Log out"
                className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setActiveTab('login')}
              className="px-3.5 py-1.5 text-xs font-bold text-emerald-700 border border-emerald-600 rounded-lg hover:bg-emerald-50 transition"
            >
              Sign In
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
