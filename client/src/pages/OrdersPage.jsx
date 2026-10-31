import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  FileText,
  Download,
  Clock,
  CheckCircle,
  Truck,
  Package,
  Store,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

const STATUS_STEPS = [
  { key: 'accepted', label: 'Accepted by Farmer', icon: CheckCircle },
  { key: 'preparing', label: 'Crating & Quality Check', icon: Package },
  { key: 'dispatched', label: 'Out for Local Delivery', icon: Truck },
  { key: 'delivered', label: 'Delivered to Kitchen', icon: CheckCircle },
];

export default function OrdersPage() {
  const { token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCheckouts, setExpandedCheckouts] = useState({});

  const fetchOrders = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/orders', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setOrders(data || []);

      // Auto-expand latest checkout
      if (data && data.length > 0) {
        setExpandedCheckouts({ [data[0]._id]: true });
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [token]);

  const toggleExpand = (id) => {
    setExpandedCheckouts((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDownloadInvoice = (checkoutId) => {
    window.open(`/api/invoices/checkout/${checkoutId}/pdf`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Procurement Orders & Invoices</h1>
          <p className="text-xs text-slate-500">
            Real-time fulfillment tracking for multi-vendor split orders and legal PDF tax invoices.
          </p>
        </div>

        <button
          onClick={fetchOrders}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Status</span>
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent mb-3"></div>
          <p className="text-sm font-semibold">Loading purchase history & split orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 space-y-3">
          <FileText className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No Orders Placed Yet</h3>
          <p className="text-xs text-slate-400">
            When you complete a multi-vendor checkout, your parent transaction and split orders appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((checkout) => {
            const isExpanded = expandedCheckouts[checkout._id];

            return (
              <div
                key={checkout._id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm transition"
              >
                {/* Checkout Header Card */}
                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="bg-emerald-100 text-emerald-800 font-bold text-xs px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        Parent Checkout
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(checkout.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <h3 className="text-base font-extrabold text-slate-900">
                      ID: <span className="font-mono text-emerald-700">{checkout._id}</span>
                    </h3>

                    <div className="text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1 pt-0.5">
                      <span>
                        Total Paid:{' '}
                        <strong className="text-slate-900 font-bold">₹{checkout.totalAmount}</strong>
                      </span>
                      <span>
                        Payment:{' '}
                        <strong className="text-emerald-700 uppercase font-bold">
                          {checkout.paymentMethod.replace('_', ' ')}
                        </strong>
                      </span>
                      <span>
                        Split Vendors:{' '}
                        <strong className="text-slate-900 font-bold">
                          {checkout.orderIds?.length || 0} Suppliers
                        </strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* PDF Download Button */}
                    <button
                      onClick={() => handleDownloadInvoice(checkout._id)}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download PDF Invoice</span>
                    </button>

                    <button
                      onClick={() => toggleExpand(checkout._id)}
                      className="p-2 text-slate-500 hover:bg-slate-200/70 rounded-xl transition"
                    >
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Split Child Vendor Orders Section */}
                {isExpanded && (
                  <div className="p-5 border-t border-slate-200 space-y-4 bg-white">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Automated Split Vendor Orders ({checkout.orderIds?.length})
                    </h4>

                    <div className="grid grid-cols-1 gap-4">
                      {checkout.orderIds?.map((order) => {
                        const currentStepIndex = Math.max(
                          STATUS_STEPS.findIndex((s) => s.key === order.status),
                          0
                        );

                        return (
                          <div
                            key={order._id}
                            className="bg-slate-50/80 rounded-xl p-4 border border-slate-200 space-y-3"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <Store className="w-4 h-4 text-emerald-600" />
                                  <span className="text-sm font-bold text-slate-900">
                                    {order.vendorId?.businessName || 'Local Producer'}
                                  </span>
                                  <span className="text-xs font-mono text-slate-500">
                                    (Order #{order.orderNumber})
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                  {order.vendorId?.address || 'Local Farmland, Coimbatore'}
                                </p>
                              </div>

                              <div className="text-right">
                                <span className="text-sm font-extrabold text-slate-900">
                                  ₹{order.subtotal}
                                </span>
                                <span className="block text-[10px] text-emerald-700 font-semibold">
                                  Platform Comm (5%): ₹{order.commissionAmount} | Vendor Share: ₹{order.vendorPayout}
                                </span>
                              </div>
                            </div>

                            {/* Status Progress Bar */}
                            <div className="pt-1">
                              <div className="flex items-center justify-between relative">
                                {STATUS_STEPS.map((step, idx) => {
                                  const isDone = idx <= currentStepIndex;
                                  const isCurrent = idx === currentStepIndex;

                                  return (
                                    <div key={step.key} className="flex-1 flex flex-col items-center relative z-10">
                                      <div
                                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition ${
                                          isDone
                                            ? 'bg-emerald-600 border-emerald-600 text-white'
                                            : 'bg-white border-slate-300 text-slate-400'
                                        } ${isCurrent ? 'ring-4 ring-emerald-500/20' : ''}`}
                                      >
                                        <step.icon className="w-3.5 h-3.5" />
                                      </div>
                                      <span
                                        className={`text-[10px] mt-1 font-bold text-center ${
                                          isDone ? 'text-slate-900' : 'text-slate-400'
                                        }`}
                                      >
                                        {step.label}
                                      </span>
                                    </div>
                                  );
                                })}

                                {/* Background connector line */}
                                <div className="absolute top-3.5 left-8 right-8 h-0.5 bg-slate-200 -z-0">
                                  <div
                                    className="h-full bg-emerald-600 transition-all duration-300"
                                    style={{
                                      width: `${(currentStepIndex / (STATUS_STEPS.length - 1)) * 100}%`,
                                    }}
                                  ></div>
                                </div>
                              </div>
                            </div>

                            {/* Line items in this vendor order */}
                            <div className="pt-2 border-t border-slate-200/60">
                              <div className="text-[11px] font-semibold text-slate-600 mb-1">
                                Ordered Products:
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {order.items?.map((item, idx) => (
                                  <span
                                    key={idx}
                                    className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-800"
                                  >
                                    {item.name}: <strong>{item.quantity} {item.unit}</strong> @ ₹{item.price} (₹{item.subtotal})
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
