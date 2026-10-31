import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Navbar from './components/Navbar';
import DiscoveryPage from './pages/DiscoveryPage';
import CatalogPage from './pages/CatalogPage';
import CartPage from './pages/CartPage';
import OrdersPage from './pages/OrdersPage';
import VendorPortalPage from './pages/VendorPortalPage';
import AdminPortalPage from './pages/AdminPortalPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ScheduledOrdersPage from './pages/ScheduledOrdersPage';

function MainApp() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('discovery');
  const [selectedVendorForCatalog, setSelectedVendorForCatalog] = useState(null);

  const handleSelectVendor = (vendorId) => {
    setSelectedVendorForCatalog(vendorId);
    setActiveTab('catalog');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'discovery' && (
          <DiscoveryPage
            onSelectVendor={handleSelectVendor}
            onBrowseCatalog={() => {
              setSelectedVendorForCatalog(null);
              setActiveTab('catalog');
            }}
          />
        )}

        {activeTab === 'catalog' && (
          <CatalogPage
            selectedVendorId={selectedVendorForCatalog}
            onGoToCart={() => setActiveTab('cart')}
          />
        )}

        {activeTab === 'cart' && (
          <CartPage
            onOrderSuccess={() => setActiveTab('orders')}
            onContinueShopping={() => setActiveTab('catalog')}
          />
        )}

        {activeTab === 'orders' && <OrdersPage />}

        {activeTab === 'scheduled-orders' && <ScheduledOrdersPage />}

        {activeTab === 'vendor-portal' && <VendorPortalPage />}

        {activeTab === 'admin-portal' && <AdminPortalPage />}

        {activeTab === 'login' && (
          <LoginPage
            onRegisterClick={() => setActiveTab('register')}
            onLoginSuccess={() => setActiveTab('discovery')}
          />
        )}

        {activeTab === 'register' && (
          <RegisterPage
            onLoginClick={() => setActiveTab('login')}
            onRegisterSuccess={() => setActiveTab('discovery')}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <span>🥬 FreshCart B2B Marketplace</span>
            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px]">
              Production Modular Monolith
            </span>
          </div>
          <p>
            Hyperlocal Discovery (≤20km) • Multi-Vendor Order Splitting • Persistent Database Configuration • Automated Invoicing
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <MainApp />
      </CartProvider>
    </AuthProvider>
  );
}
