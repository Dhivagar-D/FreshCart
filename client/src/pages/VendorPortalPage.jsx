import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Store,
  DollarSign,
  TrendingUp,
  Package,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  Truck,
  Clock,
  AlertCircle,
  RefreshCw,
  X,
} from 'lucide-react';

export default function VendorPortalPage() {
  const { user, token } = useAuth();
  const isApprovedVendor = user?.vendor?.verificationStatus === 'approved';
  const [metrics, setMetrics] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' or 'inventory'

  // New Product Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [newProd, setNewProd] = useState({
    name: '',
    category: 'Vegetables',
    price: '',
    unit: 'kg',
    stock: '',
    minOrderQty: 1,
    description: '',
    imageUrl: '',
    harvestDate: new Date().toISOString().slice(0, 10),
    grade: 'standard',
    expectedAvailableAt: '',
    minimumShelfLifeDays: 0,
    origin: '',
    organicCertified: false,
  });

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      // 1. Vendor Metrics
      const mRes = await fetch('/api/orders/vendor/metrics', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (mRes.ok) setMetrics(await mRes.json());

      // 2. Vendor Specific Orders
      const oRes = await fetch('/api/orders/vendor/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (oRes.ok) setOrders(await oRes.json());

      const fRes = await fetch('/api/products/forecast/summary', { headers: { Authorization: `Bearer ${token}` } });
      if (fRes.ok) setForecast(await fRes.json());

      // 3. Vendor Products
      const vendorId = user?.vendorId || user?.vendor?._id;
      if (vendorId) {
        const pRes = await fetch(`/api/products?vendorId=${vendorId}&inStockOnly=false`);
        if (pRes.ok) setProducts(await pRes.json());
      }
    } catch (err) {
      console.error('Failed to load vendor data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token, user]);

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      let codCollected = false;
      let deliveryTrackingCode = '';
      let deliveryPartner = '';
      let deliveryProofUrl = '';
      const selectedOrder = orders.find((order) => order._id === orderId);
      if (newStatus === 'delivered' && selectedOrder?.checkoutId?.paymentMethod === 'cod') {
        codCollected = window.confirm('Confirm that the buyer has paid the cash-on-delivery amount in full. Continue only if cash was collected.');
        if (!codCollected) return;
        deliveryProofUrl = window.prompt('Optional proof-of-delivery URL (leave blank if unavailable):') || '';
      }
      if (newStatus === 'dispatched') {
        deliveryPartner = window.prompt('Delivery partner / driver name (optional):') || '';
        deliveryTrackingCode = window.prompt('Delivery tracking code (optional):') || '';
      }
      const res = await fetch(`/api/orders/vendor/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus, codCollected, deliveryPartner, deliveryTrackingCode, deliveryProofUrl }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update order');
      }
      // Refresh
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    const productIdBeingEdited = editingProductId;
    try {
      const res = await fetch(productIdBeingEdited ? `/api/products/${productIdBeingEdited}` : '/api/products', {
        method: productIdBeingEdited ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newProd),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || (productIdBeingEdited ? 'Failed to update product' : 'Failed to create product'));

      setShowAddModal(false);
      setEditingProductId(null);
      setProducts((current) =>
        productIdBeingEdited
          ? current.map((product) => (product._id === data._id ? data : product))
          : [data, ...current]
      );
      setNewProd({
        name: '',
        category: 'Vegetables',
        price: '',
        unit: 'kg',
        stock: '',
        minOrderQty: 1,
        description: '',
        imageUrl: '',
        harvestDate: new Date().toISOString().slice(0, 10), grade: 'standard', expectedAvailableAt: '', minimumShelfLifeDays: 0, origin: '', organicCertified: false,
      });
      await fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRemoveProduct = async (product) => {
    if (!window.confirm(`Remove "${product.name}" permanently? This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/products/${product._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove product');

      setProducts((current) => current.filter((item) => item._id !== product._id));
      setForecast((current) =>
        current ? { ...current, products: current.products.filter((item) => String(item.productId) !== String(product._id)) } : current
      );
    } catch (err) {
      alert(err.message);
    }
  };

  const openEditProduct = (product) => {
    setEditingProductId(product._id);
    setNewProd({
      name: product.name || '',
      category: product.category || 'Vegetables',
      price: product.price ?? '',
      unit: product.unit || 'kg',
      stock: product.stock ?? '',
      minOrderQty: product.minOrderQty || 1,
      description: product.description || '',
      imageUrl: product.imageUrl || '',
      harvestDate: product.harvestDate ? new Date(product.harvestDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      grade: product.grade || 'standard',
      expectedAvailableAt: product.expectedAvailableAt || '',
      minimumShelfLifeDays: product.minimumShelfLifeDays || 0,
      origin: product.origin || '',
      organicCertified: Boolean(product.organicCertified),
    });
    setShowAddModal(true);
  };

  const handleUpdateStock = async (productId, currentStock) => {
    const newStock = prompt('Enter new stock quantity:', currentStock);
    if (newStock === null) return;
    const parsedStock = Number(newStock);
    if (!Number.isFinite(parsedStock) || parsedStock < 0) {
      alert('Stock must be a non-negative number.');
      return;
    }
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ stock: parsedStock }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update stock');
      setProducts((current) => current.map((product) => (product._id === data._id ? data : product)));
      setForecast((current) =>
        current
          ? { ...current, products: current.products.map((item) => (String(item.productId) === String(data._id) ? { ...item, stock: data.stock } : item)) }
          : current
      );
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Vendor Top Banner */}
      <div className="bg-gradient-to-r from-forest-900 via-forest-800 to-slate-900 text-white rounded-3xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="bg-emerald-500/20 text-emerald-300 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-emerald-400/30">
            Producer Fulfillment Portal
          </span>
          <h1 className="text-2xl font-black mt-2">
            {metrics?.vendorDetails?.businessName || user?.businessName || 'Farmer / Vendor Portal'}
          </h1>
          <p className="text-xs text-slate-300 mt-0.5">
            Manage your localized fresh produce listings, real-time incoming restaurant orders, and automated commission payouts.
          </p>
        </div>

        {user?.vendor && user.vendor.verificationStatus !== 'approved' && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-4 text-sm">
            <p className="font-bold">Vendor approval is required before managing listings.</p>
            <p className="mt-1 text-xs">
              Your profile is currently <strong>{user.vendor.verificationStatus}</strong>. An administrator must approve it before you can add or edit produce.
            </p>
          </div>
        )}

        <button
          onClick={fetchData}
          className="self-start md:self-auto bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3.5 py-2 rounded-xl border border-white/20 flex items-center gap-1.5 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Gross Sales</span>
          <div className="text-xl font-black text-slate-900 mt-1">₹{metrics?.grossSales || 0}</div>
          <span className="text-[10px] text-slate-400">Total order volume</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Platform Commission</span>
          <div className="text-xl font-black text-emerald-700 mt-1">₹{metrics?.totalCommissionPaid || 0}</div>
          <span className="text-[10px] text-emerald-600 font-semibold">5% Marketplace Take</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Net Vendor Payout</span>
          <div className="text-xl font-black text-slate-900 mt-1">₹{metrics?.netPayout || 0}</div>
          <span className="text-[10px] text-slate-500">Scheduled via Stripe/Razorpay</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Active Incoming</span>
          <div className="text-xl font-black text-amber-600 mt-1">{metrics?.activeOrders || 0} Orders</div>
          <span className="text-[10px] text-amber-700 font-semibold">Requiring fulfillment</span>
        </div>
      </div>

      {/* Navigation Pills */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'orders'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Incoming Vendor Orders ({orders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'inventory'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>My Inventory & Listings ({products.length})</span>
        </button>
      </div>

      {/* Tab 1: Incoming Orders */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
              <Store className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800">No incoming orders for your store at this moment.</p>
              <p className="text-xs text-slate-400 mt-1">Orders split from buyer checkouts will immediately appear here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order._id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900">
                          Order #{order.orderNumber}
                        </span>
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            order.status === 'delivered'
                              ? 'bg-emerald-100 text-emerald-800'
                              : order.status === 'dispatched'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Buyer: <strong>{order.buyerId?.businessName || order.buyerId?.name}</strong> | Phone:{' '}
                        {order.buyerId?.phone || 'N/A'}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Delivery Address: {order.checkoutId?.deliveryAddress?.street},{' '}
                        {order.checkoutId?.deliveryAddress?.area}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-black text-slate-900">₹{order.subtotal}</div>
                      <div className="text-[10px] text-emerald-700 font-semibold">
                        Payout: <strong>₹{order.vendorPayout}</strong> (5% comm: ₹{order.commissionAmount})
                      </div>
                    </div>
                  </div>

                  {/* Items Ordered */}
                  <div className="space-y-1.5 text-xs">
                    <span className="font-bold text-slate-700">Line Items to Prepare:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {order.items?.map((item, idx) => (
                        <div
                          key={idx}
                          className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl flex justify-between"
                        >
                          <div>
                            <span className="font-bold text-slate-800 block">{item.name}</span>
                            <span className="text-[11px] text-slate-500">₹{item.price} / {item.unit}</span>
                          </div>
                          <span className="font-black text-emerald-800 self-center">
                            {item.quantity} {item.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Status Change Buttons */}
                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs font-semibold text-slate-500">Update Fulfillment State:</span>
                    <div className="flex flex-wrap gap-2">
                      {order.status === 'pending' && (
                        <button
                          onClick={() => handleUpdateOrderStatus(order._id, 'accepted')}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition"
                        >
                          Accept Order
                        </button>
                      )}
                      {order.status === 'accepted' && (
                        <button
                          onClick={() => handleUpdateOrderStatus(order._id, 'preparing')}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition"
                        >
                          Mark Preparing
                        </button>
                      )}
                      {order.status === 'preparing' && (
                        <button
                          onClick={() => handleUpdateOrderStatus(order._id, 'dispatched')}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>Mark Dispatched</span>
                        </button>
                      )}
                      {order.status === 'dispatched' && (
                        <button
                          onClick={() => handleUpdateOrderStatus(order._id, 'delivered')}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Mark Delivered</span>
                        </button>
                      )}
                      {order.status === 'delivered' && (
                        <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-md">
                          <CheckCircle className="w-3.5 h-3.5" /> Completed & Delivered
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'inventory' && forecast?.products && (
        <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <div><h3 className="font-bold text-slate-900">Demand planning · next 7 days</h3><p className="text-xs text-slate-500">30-day moving average baseline; estimates are not a guarantee.</p></div>
          {forecast.products.length === 0 ? <p className="text-sm text-slate-500">No products available for forecasting yet.</p> : <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{forecast.products.slice(0, 6).map((item) => <div key={item.productId} className="rounded-xl bg-slate-50 border border-slate-100 p-3"><div className="text-sm font-bold text-slate-800">{item.name}</div><div className="mt-1 text-xs text-slate-500">Current stock: {item.stock} {item.unit}</div><div className="text-xs text-slate-500">7-day estimated demand: {item.estimatedNext7Days} {item.unit}</div><div className={`mt-2 text-xs font-bold ${item.suggestedReorder > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>{item.suggestedReorder > 0 ? `Suggested reorder: ${item.suggestedReorder} ${item.unit}` : 'Stock estimate looks sufficient'}</div></div>)}</div>}
        </section>
      )}

      {/* Tab 2: Inventory & Listings */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">Your Fresh Produce Catalog</h3>
            <button
              onClick={() => {
                setEditingProductId(null);
                setShowAddModal(true);
              }}
              disabled={!isApprovedVendor}
              title={!isApprovedVendor ? 'Vendor approval is required before adding listings' : 'Add a produce listing'}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Produce Listing</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((p) => (
              <div
                key={p._id}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="h-32 bg-slate-100 rounded-xl overflow-hidden mb-3">
                    <img
                      src={p.imageUrl || 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=300'}
                      alt={p.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex items-start justify-between gap-1">
                    <h4 className="text-xs font-bold text-slate-900">{p.name}</h4>
                    <span className="text-xs font-black text-emerald-700">₹{p.price}/{p.unit}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{p.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]"><span className="rounded-full bg-emerald-50 text-emerald-700 px-2 py-1">Grade {p.grade || 'standard'}</span>{p.origin && <span className="rounded-full bg-slate-100 text-slate-600 px-2 py-1">{p.origin}</span>}{p.organicCertified && <span className="rounded-full bg-lime-50 text-lime-700 px-2 py-1">Organic verified</span>}</div>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-500">Available Stock:</span>
                    <strong className="ml-1 text-slate-900">{p.stock} {p.unit}</strong>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditProduct(p)}
                      disabled={!isApprovedVendor}
                      className="text-blue-700 hover:text-blue-800 disabled:text-slate-400 font-bold bg-blue-50 disabled:bg-slate-50 px-2 py-1 rounded"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleUpdateStock(p._id, p.stock)}
                      disabled={!isApprovedVendor}
                      className="text-emerald-700 hover:text-emerald-800 disabled:text-slate-400 font-bold bg-emerald-50 disabled:bg-slate-50 px-2 py-1 rounded"
                    >
                      Adjust Stock
                    </button>
                    <button
                      onClick={() => handleRemoveProduct(p)}
                      disabled={!isApprovedVendor}
                      className="text-rose-700 hover:text-rose-800 disabled:text-slate-400 font-bold bg-rose-50 disabled:bg-slate-50 px-2 py-1 rounded"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingProductId ? 'Edit Fresh Produce Listing' : 'List New Fresh Produce'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingProductId(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Organic Seedless Cucumbers"
                  value={newProd.name}
                  onChange={(e) => setNewProd({ ...newProd, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Category</label>
                  <select
                    value={newProd.category}
                    onChange={(e) => setNewProd({ ...newProd, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option>Vegetables</option>
                    <option>Fruits</option>
                    <option>Dairy</option>
                    <option>Herbs & Microgreens</option>
                    <option>Organic Specials</option>
                    <option>Grains & Pulses</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Unit</label>
                  <input
                    type="text"
                    required
                    placeholder="kg, bunch, litre"
                    value={newProd.unit}
                    onChange={(e) => setNewProd({ ...newProd, unit: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Price (₹)</label>
                  <input
                    type="number"
                    required
                    placeholder="45"
                    value={newProd.price}
                    onChange={(e) => setNewProd({ ...newProd, price: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Stock</label>
                  <input
                    type="number"
                    required
                    placeholder="100"
                    value={newProd.stock}
                    onChange={(e) => setNewProd({ ...newProd, stock: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Min Order</label>
                  <input
                    type="number"
                    required
                    placeholder="5"
                    value={newProd.minOrderQty}
                    onChange={(e) => setNewProd({ ...newProd, minOrderQty: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Harvest Date</label>
                  <input type="date" value={newProd.harvestDate} onChange={(e) => setNewProd({ ...newProd, harvestDate: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl" />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Produce Grade</label>
                  <select value={newProd.grade} onChange={(e) => setNewProd({ ...newProd, grade: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
                    <option value="standard">Standard</option><option value="A">Grade A</option><option value="B">Grade B</option><option value="C">Grade C</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="font-bold text-slate-700 block mb-1">Origin / Farm Area</label><input value={newProd.origin} onChange={(e) => setNewProd({ ...newProd, origin: e.target.value })} placeholder="Village / farm area" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl" /></div>
                <div><label className="font-bold text-slate-700 block mb-1">Shelf Life (days)</label><input type="number" min="0" value={newProd.minimumShelfLifeDays} onChange={(e) => setNewProd({ ...newProd, minimumShelfLifeDays: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl" /></div>
              </div>
              <label className="flex items-center gap-2 font-semibold text-slate-700"><input type="checkbox" checked={newProd.organicCertified} onChange={(e) => setNewProd({ ...newProd, organicCertified: e.target.checked })} /> Organic certification verified</label>
              <div><label className="font-bold text-slate-700 block mb-1">Expected Availability (Optional)</label><input type="datetime-local" value={newProd.expectedAvailableAt} onChange={(e) => setNewProd({ ...newProd, expectedAvailableAt: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl" /></div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Image URL (Optional)</label>
                <input
                  type="text"
                  placeholder="https://images.unsplash.com/..."
                  value={newProd.imageUrl}
                  onChange={(e) => setNewProd({ ...newProd, imageUrl: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingProductId(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
                >
                  Save & Publish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
