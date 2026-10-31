import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  DollarSign,
  TrendingUp,
  Users,
  Store,
  Check,
  X,
  Settings,
  Activity,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

export default function AdminPortalPage() {
  const { token } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [commissionInput, setCommissionInput] = useState('5');
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  const fetchAdminData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      // 1. Dashboard Metrics
      const dRes = await fetch('/api/admin/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (dRes.ok) {
        const dData = await dRes.json();
        setDashboard(dData);
        if (dData.metrics?.commissionRatePercent !== undefined) {
          setCommissionInput(dData.metrics.commissionRatePercent.toString());
        }
      }

      // 2. Vendors List
      const vRes = await fetch('/api/admin/vendors', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (vRes.ok) setVendors(await vRes.json());

      // 3. Audit Logs
      const aRes = await fetch('/api/admin/audit-logs', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (aRes.ok) setAuditLogs(await aRes.json());
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [token]);

  const handleVerifyVendor = async (vendorId, status) => {
    try {
      const res = await fetch(`/api/admin/vendors/${vendorId}/verification`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update vendor status');
      fetchAdminData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSaveCommission = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ commissionPercent: parseFloat(commissionInput) }),
      });
      if (!res.ok) throw new Error('Failed to update commission rate');
      alert('Platform commission percentage updated successfully');
      fetchAdminData();
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-slate-950 text-white rounded-3xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="bg-purple-500/20 text-purple-300 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-purple-400/30">
            Marketplace Governance & Operations
          </span>
          <h1 className="text-2xl font-black mt-2">Platform Administration Center</h1>
          <p className="text-xs text-slate-300 mt-0.5">
            Real-time oversight over marketplace Gross Merchandise Value (GMV), 20km geographic radius compliance, commission fees, and KYC vendor approvals.
          </p>
        </div>

        <button
          onClick={fetchAdminData}
          className="self-start md:self-auto bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3.5 py-2 rounded-xl border border-white/20 flex items-center gap-1.5 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Gross Merchandise Value (GMV)</span>
          <div className="text-xl font-black text-slate-900 mt-1">
            ₹{dashboard?.metrics?.grossMerchandiseValue || 0}
          </div>
          <span className="text-[10px] text-slate-400">Total B2B transactions</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Platform Commission Earned</span>
          <div className="text-xl font-black text-purple-700 mt-1">
            ₹{dashboard?.metrics?.totalPlatformCommission || 0}
          </div>
          <span className="text-[10px] text-purple-600 font-semibold">
            {dashboard?.metrics?.commissionRatePercent || 5}% Platform Take
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Split Orders</span>
          <div className="text-xl font-black text-slate-900 mt-1">
            {dashboard?.metrics?.totalVendorOrders || 0}
          </div>
          <span className="text-[10px] text-slate-400">Across {dashboard?.metrics?.totalCheckouts || 0} checkouts</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Active Suppliers</span>
          <div className="text-xl font-black text-emerald-700 mt-1">
            {dashboard?.metrics?.approvedVendors || 0} / {dashboard?.metrics?.totalVendors || 0}
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold">Approved within radius</span>
        </div>
      </div>

      {/* Grid: Vendor Verifications & Commission Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Vendor Verifications */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Producer & Vendor Verification Approvals</h3>
              <p className="text-xs text-slate-500">
                Only approved vendors are discoverable in the 20km buyer search.
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {vendors.map((v) => (
              <div key={v._id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{v.businessName}</span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        v.verificationStatus === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : v.verificationStatus === 'pending'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {v.verificationStatus}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{v.address}</div>
                  <div className="text-[10px] text-slate-400">
                    Coordinates: [{v.location?.coordinates[0]}, {v.location?.coordinates[1]}] | Contact: {v.userId?.email}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {v.verificationStatus !== 'approved' && (
                    <button
                      onClick={() => handleVerifyVendor(v._id, 'approved')}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                  )}
                  {v.verificationStatus !== 'rejected' && (
                    <button
                      onClick={() => handleVerifyVendor(v._id, 'rejected')}
                      className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Col: Commission & Settings */}
        <div className="space-y-5">
          <form
            onSubmit={handleSaveCommission}
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4"
          >
            <div className="border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-purple-600" />
                Marketplace Commission Rules
              </h3>
              <p className="text-xs text-slate-500">Server-authoritative rate deducted on order split.</p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Platform Commission Rate (%)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="50"
                  value={commissionInput}
                  onChange={(e) => setCommissionInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                />
                <span className="text-xs font-bold text-slate-600">%</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                E.g. On a ₹1,000 subtotal, {commissionInput}% yields ₹
                {((1000 * parseFloat(commissionInput || 0)) / 100).toFixed(2)} to FreshCart.
              </p>
            </div>

            <button
              type="submit"
              disabled={savingSettings}
              className="w-full bg-purple-700 hover:bg-purple-800 text-white font-bold py-2 rounded-xl text-xs transition"
            >
              {savingSettings ? 'Saving...' : 'Apply Commission Rate'}
            </button>
          </form>

          {/* Audit Log Snippet */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              Live Audit Trail
            </h3>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1 text-xs">
              {auditLogs.length === 0 ? (
                <p className="text-slate-400 text-center py-4">No audit events recorded yet.</p>
              ) : (
                auditLogs.map((log, idx) => (
                  <div key={idx} className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span className="font-bold text-slate-700">{log.action}</span>
                      <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="text-[11px] text-slate-600 mt-0.5">
                      Actor: <span className="font-semibold text-slate-800">{log.actorRole}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
