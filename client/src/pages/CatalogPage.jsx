import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  Filter,
  Plus,
  Minus,
  ShoppingBag,
  Check,
  AlertCircle,
  Sparkles,
  MapPin,
} from 'lucide-react';

const CATEGORIES = [
  'All',
  'Vegetables',
  'Fruits',
  'Dairy',
  'Herbs & Microgreens',
  'Organic Specials',
  'Grains & Pulses',
];

export default function CatalogPage({ selectedVendorId, onGoToCart }) {
  const { addToCart, loading: cartLoading } = useCart();
  const { buyerLocation } = useAuth();
  const [products, setProducts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [vendorFilter, setVendorFilter] = useState(selectedVendorId || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [quantities, setQuantities] = useState({});
  const [addedEffect, setAddedEffect] = useState({});
  const [loading, setLoading] = useState(true);

  // Sync selectedVendorId prop
  useEffect(() => {
    if (selectedVendorId) {
      setVendorFilter(selectedVendorId);
    }
  }, [selectedVendorId]);

  // Fetch vendors list for filter
  useEffect(() => {
    fetch('/api/vendors')
      .then((res) => res.json())
      .then((data) => setVendors(data || []))
      .catch((err) => console.error(err));
  }, []);

  // Fetch products with filters
  const fetchProducts = async () => {
    setLoading(true);
    try {
      let url = `/api/products?category=${selectedCategory}`;
      if (vendorFilter) url += `&vendorId=${vendorFilter}`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;

      const res = await fetch(url);
      const data = await res.json();
      setProducts(data || []);

      // Initialize default quantities to minOrderQty
      const initialQtys = {};
      data.forEach((p) => {
        initialQtys[p._id] = p.minOrderQty || 1;
      });
      setQuantities(initialQtys);
    } catch (err) {
      console.error('Fetch products error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, vendorFilter, searchQuery]);

  const handleQtyChange = (id, delta, minQty, maxStock) => {
    setQuantities((prev) => {
      const current = prev[id] || minQty;
      const updated = Math.min(Math.max(current + delta, minQty), maxStock);
      return { ...prev, [id]: updated };
    });
  };

  const handleAddToCart = async (product) => {
    const qty = quantities[product._id] || product.minOrderQty;
    try {
      await addToCart(product._id, qty);
      setAddedEffect((prev) => ({ ...prev, [product._id]: true }));
      setTimeout(() => {
        setAddedEffect((prev) => ({ ...prev, [product._id]: false }));
      }, 1500);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Catalog Header with Search & Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">Wholesale Fresh Produce Catalog</h1>
            <p className="text-xs text-slate-500">
              Select bulk produce from multiple local farms. Consolidate into one single checkout.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Box */}
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search tomatoes, milk, apples..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            {/* Vendor Filter */}
            <select
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
              className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">All Nearby Vendors</option>
              {vendors.map((v) => (
                <option key={v._id} value={v._id}>
                  {v.businessName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center text-slate-500">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent mb-3"></div>
          <p className="text-sm font-semibold">Loading fresh farm produce...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
          <p className="text-base font-bold text-slate-800">No products match your current filters.</p>
          <p className="text-xs text-slate-400 mt-1">Try resetting the category filter or searching for another term.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {products.map((product) => {
            const currentQty = quantities[product._id] || product.minOrderQty;
            const linePrice = product.price * currentQty;
            const isAdded = addedEffect[product._id];

            return (
              <div
                key={product._id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between group"
              >
                <div>
                  {/* Product Image */}
                  <div className="relative h-44 bg-slate-100 overflow-hidden">
                    <img
                      src={
                        product.imageUrl ||
                        'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&auto=format&fit=crop&q=60'
                      }
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute top-2.5 left-2.5 bg-slate-900/80 backdrop-blur-sm text-white text-[11px] font-bold px-2.5 py-1 rounded-md">
                      {product.category}
                    </div>

                    <div className="absolute bottom-2.5 right-2.5 bg-white/95 backdrop-blur-sm text-slate-900 text-xs font-black px-2.5 py-1 rounded-md shadow">
                      ₹{product.price} / {product.unit}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 space-y-2">
                    <div className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span className="truncate">{product.vendorId?.businessName || 'Local Farmer'}</span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition leading-snug">
                      {product.name}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{product.description}</p>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                      <span className="text-slate-500">
                        MOQ: <strong className="text-slate-800">{product.minOrderQty} {product.unit}</strong>
                      </span>
                      <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                        {product.stock} {product.unit} in stock
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Controls: Stepper & Add Button */}
                <div className="p-4 pt-0 space-y-2">
                  <div className="flex items-center justify-between bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                    <button
                      onClick={() =>
                        handleQtyChange(product._id, -1, product.minOrderQty, product.stock)
                      }
                      className="w-7 h-7 bg-white rounded-lg border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 active:scale-95 transition"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>

                    <div className="text-center">
                      <span className="text-xs font-black text-slate-900">
                        {currentQty} {product.unit}
                      </span>
                      <span className="block text-[10px] text-slate-500 font-medium">₹{linePrice}</span>
                    </div>

                    <button
                      onClick={() =>
                        handleQtyChange(product._id, 1, product.minOrderQty, product.stock)
                      }
                      className="w-7 h-7 bg-white rounded-lg border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 active:scale-95 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => handleAddToCart(product)}
                    disabled={cartLoading || product.stock === 0}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-sm ${
                      isAdded
                        ? 'bg-emerald-700 text-white'
                        : product.stock === 0
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-[0.98]'
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-300" />
                        <span>Added to Multi-Vendor Cart!</span>
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-4 h-4" />
                        <span>Add {currentQty} {product.unit} (₹{linePrice})</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
