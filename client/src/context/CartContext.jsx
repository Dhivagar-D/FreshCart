import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export function CartProvider({ children }) {
  const { token, user, logout } = useAuth();
  const [cart, setCart] = useState({
    items: [],
    vendorGroups: [],
    totalItemsCount: 0,
    totalAmount: 0,
  });
  const [loading, setLoading] = useState(false);

  const fetchCart = async () => {
    if (!token || user?.role !== 'buyer') {
      setCart({ items: [], vendorGroups: [], totalItemsCount: 0, totalAmount: 0 });
      return;
    }
    try {
      const res = await fetch('/api/cart', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCart(data);
      }
    } catch (err) {
      console.error('Failed to load cart:', err);
    }
  };

  useEffect(() => {
    fetchCart();
  }, [token, user]);

  const addToCart = async (productId, quantity = 1) => {
    if (!token) throw new Error('Please login to add items to cart');
    setLoading(true);
    try {
      const res = await fetch('/api/cart/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ productId, quantity }),
      });
      const data = await res.json();
      if (res.status === 401) {
        logout();
        throw new Error('Your session expired. Please sign in again.');
      }
      if (!res.ok) throw new Error(data.error || 'Failed to add item to cart');
      setCart(data.cart);
      return data;
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (productId, quantity) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/cart/items/${productId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ quantity }),
      });
      if (res.ok) {
        const data = await res.json();
        setCart(data);
      }
    } catch (err) {
      console.error('Update quantity failed:', err);
    }
  };

  const removeItem = async (productId) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/cart/items/${productId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCart(data);
      }
    } catch (err) {
      console.error('Remove item failed:', err);
    }
  };

  const clearCart = async () => {
    if (!token) return;
    try {
      await fetch('/api/cart', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setCart({ items: [], vendorGroups: [], totalItemsCount: 0, totalAmount: 0 });
    } catch (err) {
      console.error('Clear cart failed:', err);
    }
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        addToCart,
        updateQuantity,
        removeItem,
        clearCart,
        refreshCart: fetchCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
