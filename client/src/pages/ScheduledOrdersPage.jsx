import React, { useEffect, useState } from 'react';
import { CalendarClock, Pause, Play, Trash2, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ScheduledOrdersPage() {
  const { token } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: 'Weekly restaurant supply', frequency: 'weekly', productId: '', quantity: 5, nextRunAt: '', street: '', area: '', city: 'Coimbatore', pincode: '', contactPhone: '' });
  const [error, setError] = useState('');
  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [scheduleResponse, productResponse] = await Promise.all([
        fetch('/api/scheduled-orders', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/products?inStockOnly=true'),
      ]);
      if (scheduleResponse.ok) setSchedules(await scheduleResponse.json());
      if (productResponse.ok) { const list = await productResponse.json(); setProducts(list); if (!form.productId && list[0]) setForm((prev) => ({ ...prev, productId: list[0]._id })); }
    } catch { setError('Could not load schedules. Check the server connection.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [token]);
  const create = async (event) => {
    event.preventDefault(); setError('');
    try {
      const response = await fetch('/api/scheduled-orders', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ name: form.name, frequency: form.frequency, items: [{ productId: form.productId, quantity: Number(form.quantity) }], nextRunAt: new Date(form.nextRunAt).toISOString(), deliveryAddress: { street: form.street, area: form.area, city: form.city, pincode: form.pincode, contactPhone: form.contactPhone } }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Could not create schedule');
      setForm((prev) => ({ ...prev, name: 'Weekly restaurant supply', street: '', area: '', pincode: '', contactPhone: '' })); await load();
    } catch (err) { setError(err.message || 'Could not create schedule'); }
  };
  const update = async (schedule, patch) => {
    const response = await fetch(`/api/scheduled-orders/${schedule._id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(patch) });
    const data = await response.json(); if (!response.ok) return setError(data.error || 'Update failed'); await load();
  };
  const remove = async (schedule) => {
    if (!window.confirm(`Delete schedule “${schedule.name}”?`)) return;
    const response = await fetch(`/api/scheduled-orders/${schedule._id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) { const data = await response.json(); setError(data.error || 'Delete failed'); return; } await load();
  };
  return <div className="max-w-5xl mx-auto space-y-6">
    <div className="rounded-3xl bg-emerald-950 text-white p-6 flex items-center justify-between gap-4"><div><div className="text-emerald-300 text-xs font-bold uppercase tracking-widest">B2B procurement</div><h1 className="text-2xl font-black mt-1">Scheduled Bulk Orders</h1><p className="text-sm text-emerald-100/80 mt-2">Save repeat purchasing templates for your restaurant or kitchen.</p></div><CalendarClock className="w-10 h-10 text-emerald-300" /></div>
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>Important:</strong> schedules are saved templates only. FreshCart will not automatically place orders or charge you; confirm stock and price before each purchase.</div>
    {error && <div className="rounded-xl bg-rose-50 text-rose-700 p-3 text-sm">{error}</div>}
    <form onSubmit={create} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4"><h2 className="font-bold text-slate-900">Create a recurring purchase template</h2>
      <div className="grid sm:grid-cols-2 gap-3"><label className="text-xs font-semibold text-slate-600">Template name<input required maxLength="100" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm" /></label><label className="text-xs font-semibold text-slate-600">Frequency<select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm"><option value="weekly">Weekly</option><option value="biweekly">Every two weeks</option><option value="monthly">Monthly</option></select></label>
      <label className="text-xs font-semibold text-slate-600">Product<select required value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm">{products.map((product) => <option key={product._id} value={product._id}>{product.name} · ₹{product.price}/{product.unit}</option>)}</select></label><label className="text-xs font-semibold text-slate-600">Quantity<input required type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm" /></label><label className="text-xs font-semibold text-slate-600">Next planned date/time<input required type="datetime-local" value={form.nextRunAt} onChange={(e) => setForm({ ...form, nextRunAt: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm" /></label><label className="text-xs font-semibold text-slate-600">Delivery address<input required value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm" placeholder="Street / building" /></label><label className="text-xs font-semibold text-slate-600">Area<input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm" /></label><label className="text-xs font-semibold text-slate-600">City<input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm" /></label></div>
      <button disabled={!products.length} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">Save schedule</button>
      {!products.length && <p className="text-xs text-slate-500">No available products found yet. Browse the catalog after vendors publish listings.</p>}
    </form>
    <div className="bg-white rounded-2xl border border-slate-200 p-5"><div className="flex justify-between items-center"><h2 className="font-bold">Your saved schedules</h2><button onClick={load} className="text-sm text-emerald-700 flex items-center gap-1"><RefreshCw className="w-4 h-4" /> Refresh</button></div>
      {loading ? <p className="py-6 text-sm text-slate-500">Loading…</p> : schedules.length === 0 ? <p className="py-6 text-sm text-slate-500">No schedules yet. Create your first template above.</p> : <div className="divide-y divide-slate-100 mt-3">{schedules.map((schedule) => <div key={schedule._id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><div className="font-bold text-slate-800">{schedule.name} <span className={`ml-2 text-xs rounded-full px-2 py-1 ${schedule.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{schedule.active ? 'Active template' : 'Paused'}</span></div><p className="text-xs text-slate-500 mt-1">{schedule.frequency} · Next planned: {new Date(schedule.nextRunAt).toLocaleString()}</p><p className="text-xs text-slate-600 mt-1">{schedule.items?.map((item) => `${item.productId?.name || 'Product'} × ${item.quantity}`).join(', ')}</p></div><div className="flex gap-2"><button onClick={() => update(schedule, { active: !schedule.active })} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold flex items-center gap-1">{schedule.active ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}{schedule.active ? 'Pause' : 'Resume'}</button><button onClick={() => remove(schedule)} className="rounded-lg border border-rose-200 text-rose-700 px-3 py-2"><Trash2 className="w-3.5 h-3.5" /></button></div></div>)}</div>}
    </div>
  </div>;
}
