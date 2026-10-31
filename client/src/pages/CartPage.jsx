import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import {
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Store,
  CreditCard,
  Building,
  Truck,
  Sparkles,
} from 'lucide-react';

export default function CartPage({ onOrderSuccess, onContinueShopping }) {
  const { cart, updateQuantity, removeItem, clearCart } = useCart();
  const { user, token, buyerLocation } = useAuth();

  const [checkingOut, setCheckingOut] = useState(false);
  const [successOrder, setSuccessOrder] = useState(null);
  const [address, setAddress] = useState({
    street: 'RS Puram Main Road',
    area: 'RS Puram',
    city: 'Coimbatore',
    pincode: '641002',
    contactPhone: user?.phone || '+91 98888 11111',
  });
  const [paymentMethod, setPaymentMethod] = useState('razorpay_route');

  const vendorGroups = cart?.vendorGroups || [];
  const grandTotal = cart?.totalAmount || 0;

  if (user?.role !== 'buyer') {
    return (
      <div className="max-w-xl mx-auto bg-white rounded-3xl border border-slate-200 p-10 text-center shadow-sm space-y-4">
        <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Buyer checkout only</h2>
        <p className="text-sm text-slate-500">
          Vendor and administrator accounts cannot create buyer checkouts. Switch to a buyer account to place an order.
        </p>
        <button
          onClick={onContinueShopping}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition"
        >
          Return to catalog
        </button>
      </div>
    );
  }

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      alert('Please log in to complete checkout');
      return;
    }

    setCheckingOut(true);
    try {
      const idempotencyKey = `FC_IDEM_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          idempotencyKey,
          deliveryAddress: address,
          deliveryCoordinates: {
            latitude: buyerLocation.latitude,
            longitude: buyerLocation.longitude,
          },
          paymentMethod,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Checkout failed');

      // Never represent checkout creation as a completed payment. Online payments
      // require a real provider order and the backend's signed webhook confirmation.
      if (paymentMethod === 'razorpay_route') {
        const intentRes = await fetch('/api/payments/create-intent', {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ checkoutId: data.checkout?._id }),
        });
        const intent = await intentRes.json();
        if (!intentRes.ok) throw new Error(intent.error || 'Could not start online payment. Your checkout is pending; contact support before retrying.');
        if (!window.Razorpay) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script'); script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = resolve; script.onerror = () => reject(new Error('Could not load Razorpay Checkout')); document.body.appendChild(script);
          });
        }
        await new Promise((resolve, reject) => {
          const checkoutUi = new window.Razorpay({
            key: intent.keyId, amount: intent.amount, currency: intent.currency, name: 'FreshCart',
            description: 'Fresh produce procurement', order_id: intent.providerOrderId,
            prefill: { name: user?.name || '', email: user?.email || '', contact: user?.phone || '' },
            theme: { color: '#059669' },
            handler: () => resolve(),
            modal: { ondismiss: () => reject(new Error('Payment window closed. The order remains pending until payment is verified.')) },
          });
          checkoutUi.on('payment.failed', (event) => reject(new Error(event.error?.description || 'Payment failed')));
          checkoutUi.open();
        });
      }
      setSuccessOrder({ ...data, paymentPendingVerification: paymentMethod === 'razorpay_route' });
      if (onOrderSuccess) onOrderSuccess(data);
    } catch (err) {
      alert('Checkout error: ' + err.message);
    } finally {
      setCheckingOut(false);
    }
  };

  if (successOrder) {
    return (
      <div className="max-w-3xl mx-auto bg-white rounded-3xl border border-slate-200 p-8 shadow-xl text-center space-y-6">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div>
          <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${successOrder.paymentPendingVerification ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
            {successOrder.paymentPendingVerification ? 'Payment submitted · verification pending' : 'Checkout created'}
          </span>
          <h2 className="text-2xl font-black text-slate-900 mt-2">{successOrder.paymentPendingVerification ? 'Waiting for payment confirmation' : 'Procurement order created'}</h2>
          <p className="text-xs text-slate-500 mt-2">The order is not treated as paid until the verified payment-provider webhook is received.</p>
          <p className="text-sm text-slate-500 mt-1">
            Reference ID:{' '}
            <code className="bg-slate-100 px-2 py-0.5 rounded font-mono text-emerald-700 font-bold">
              {successOrder.checkout?._id}
            </code>
          </p>
        </div>

        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 text-left space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 border-b border-slate-200 pb-2">
            <span>Automated Order Splitting Result</span>
            <span className="text-emerald-700 font-bold">{successOrder.vendorOrders?.length} Vendor Orders Created</span>
          </div>

          <div className="space-y-2">
            {successOrder.vendorOrders?.map((vo) => (
              <div
                key={vo._id}
                className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <Store className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Order #{vo.orderNumber}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {vo.items?.length} items ({vo.items?.map((i) => i.name).join(', ')})
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-black text-slate-900">₹{vo.subtotal}</div>
                  <div className="text-[10px] text-emerald-700 font-semibold">
                    Platform Commission (5%): ₹{vo.commissionAmount} | Payout: ₹{vo.vendorPayout}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={() => {
              setSuccessOrder(null);
              if (onOrderSuccess) onOrderSuccess(null);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition shadow-md shadow-emerald-600/20"
          >
            Track in Orders & View Invoices
          </button>
          <button
            onClick={() => {
              setSuccessOrder(null);
              onContinueShopping();
            }}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-5 py-2.5 rounded-xl text-sm transition"
          >
            Continue Sourcing Produce
          </button>
        </div>
      </div>
    );
  }

  if (cart?.items?.length === 0) {
    return (
      <div className="max-w-xl mx-auto bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm space-y-4">
        <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Your multi-vendor cart is empty</h2>
        <p className="text-xs text-slate-500">
          Browse nearby farmers and suppliers within 20 km to add fresh produce to your commercial procurement cart.
        </p>
        <button
          onClick={onContinueShopping}
          className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition"
        >
          Discover Fresh Produce
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Multi-Vendor Procurement Cart</h1>
          <p className="text-xs text-slate-500">
            Products from {vendorGroups.length} distinct suppliers. One single consolidated checkout.
          </p>
        </div>
        <button
          onClick={clearCart}
          className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Empty Cart
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Grouped Cart Items */}
        <div className="lg:col-span-2 space-y-5">
          {vendorGroups.map((group) => (
            <div
              key={group.vendorId}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm"
            >
              {/* Vendor Section Header */}
              <div className="bg-slate-50/80 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-emerald-100 text-emerald-800 rounded-lg flex items-center justify-center font-bold text-xs">
                    <Store className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{group.vendorName}</h3>
                    <p className="text-[11px] text-slate-500">{group.vendorAddress}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold text-slate-800">
                    Vendor Subtotal: ₹{group.subtotal}
                  </span>
                  <span className="block text-[10px] text-emerald-700 font-semibold">
                    (Split Order #{group.vendorName.substring(0, 3).toUpperCase()})
                  </span>
                </div>
              </div>

              {/* Items for this vendor */}
              <div className="divide-y divide-slate-100 p-2">
                {group.items.map((item) => (
                  <div
                    key={item.productId}
                    className="p-3 flex items-center justify-between gap-4 hover:bg-slate-50/50 rounded-xl transition"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={
                          item.imageUrl ||
                          'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=100&auto=format&fit=crop&q=60'
                        }
                        alt={item.name}
                        className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0"
                      />
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{item.name}</h4>
                        <div className="text-[11px] text-slate-500">
                          ₹{item.price} / {item.unit}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          MOQ: {item.minOrderQty} {item.unit} | Stock: {item.stock} {item.unit}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          className="w-6 h-6 rounded bg-white flex items-center justify-center text-slate-700 hover:bg-slate-200"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 text-xs font-black text-slate-800">
                          {item.quantity} {item.unit}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          className="w-6 h-6 rounded bg-white flex items-center justify-center text-slate-700 hover:bg-slate-200"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="text-right min-w-[70px]">
                        <div className="text-xs font-black text-slate-900">₹{item.subtotal}</div>
                      </div>

                      <button
                        onClick={() => removeItem(item.productId)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Right Col: Consolidated Checkout Summary & Form */}
        <div className="space-y-4">
          <form
            onSubmit={handleCheckoutSubmit}
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="text-sm font-bold text-slate-900">Single Consolidated Checkout</h3>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                Server-Calculated
              </span>
            </div>

            {/* Split breakdown */}
            <div className="space-y-1.5 text-xs">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Vendor Subtotal Breakdown
              </div>
              {vendorGroups.map((g) => (
                <div key={g.vendorId} className="flex justify-between text-slate-600">
                  <span className="truncate pr-2">{g.vendorName}</span>
                  <span className="font-semibold text-slate-900">₹{g.subtotal}</span>
                </div>
              ))}

              <div className="border-t border-slate-100 pt-2 flex justify-between text-xs text-slate-500">
                <span>Platform Commission (Included)</span>
                <span className="font-semibold text-emerald-700">5.0% Server Managed</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>Direct Farmer Local Delivery</span>
                <span className="font-semibold text-emerald-700">FREE (&lt;20km)</span>
              </div>

              <div className="border-t-2 border-slate-900 pt-2 flex justify-between text-base font-black text-slate-900">
                <span>Total Payable Amount</span>
                <span className="text-emerald-700">₹{grandTotal}</span>
              </div>
            </div>

            {/* Delivery Details */}
            <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
              <label className="font-bold text-slate-800 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-emerald-600" />
                Restaurant Delivery Address
              </label>
              <input
                type="text"
                required
                value={address.street}
                onChange={(e) => setAddress({ ...address, street: e.target.value })}
                placeholder="Street address / Restaurant unit"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  value={address.area}
                  onChange={(e) => setAddress({ ...address, area: e.target.value })}
                  placeholder="Locality"
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
                <input
                  type="text"
                  required
                  value={address.pincode}
                  onChange={(e) => setAddress({ ...address, pincode: e.target.value })}
                  placeholder="PIN code"
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <input
                type="text"
                required
                value={address.contactPhone}
                onChange={(e) => setAddress({ ...address, contactPhone: e.target.value })}
                placeholder="Contact Phone"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>

            {/* Marketplace Payment Method */}
            <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
              <label className="font-bold text-slate-800 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                Marketplace Settlement Mode
              </label>

              <div className="space-y-1.5">
                <label
                  className={`flex items-start gap-2.5 p-2 rounded-xl border cursor-pointer transition ${
                    paymentMethod === 'razorpay_route'
                      ? 'bg-emerald-50 border-emerald-500'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="pm"
                    value="razorpay_route"
                    checked={paymentMethod === 'razorpay_route'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="mt-0.5 text-emerald-600"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block">Razorpay Route (India Auto-Split)</span>
                    <span className="text-[11px] text-slate-500 block">
                      Splits payment directly to vendor linked accounts with commission deduction.
                    </span>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-2.5 p-2 rounded-xl border cursor-pointer transition ${
                    paymentMethod === 'stripe_connect'
                      ? 'bg-emerald-50 border-emerald-500'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="pm"
                    value="stripe_connect"
                    checked={paymentMethod === 'stripe_connect'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="mt-0.5 text-emerald-600"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block">Stripe Connect (Custom Transfers)</span>
                    <span className="text-[11px] text-slate-500 block">
                      Multi-destination charges & automated vendor payout ledger.
                    </span>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-2.5 p-2 rounded-xl border cursor-pointer transition ${
                    paymentMethod === 'cod'
                      ? 'bg-emerald-50 border-emerald-500'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="pm"
                    value="cod"
                    checked={paymentMethod === 'cod'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="mt-0.5 text-emerald-600"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block">Pay on Commercial Delivery</span>
                    <span className="text-[11px] text-slate-500 block">Direct payment upon morning produce delivery.</span>
                  </div>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={checkingOut}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 rounded-xl text-sm transition shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
            >
              {checkingOut ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Splitting & Reserving Stock...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Confirm Checkout (₹{grandTotal})</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
