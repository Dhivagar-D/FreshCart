import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const DEMO_BUYER_COORDS = {
  name: 'RS Puram, Coimbatore (Default Buyer Location)',
  latitude: 11.0168,
  longitude: 76.9558,
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('freshcart_user');
    if (!saved) return null;
    try {
      return JSON.parse(saved);
    } catch {
      localStorage.removeItem('freshcart_user');
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('freshcart_token') || '');
  const [buyerLocation, setBuyerLocation] = useState(DEMO_BUYER_COORDS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return undefined;

    let active = true;
    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          if (active && data.user) setUser(data.user);
          return;
        }

        if (res.status === 401 && active) {
          setUser(null);
          setToken('');
        }
      })
      .catch(() => {
        // Keep the cached session during temporary network failures.
      });

    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    if (user && token) {
      localStorage.setItem('freshcart_user', JSON.stringify(user));
      localStorage.setItem('freshcart_token', token);
    } else {
      localStorage.removeItem('freshcart_user');
      localStorage.removeItem('freshcart_token');
    }
  }, [user, token]);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      setUser(data.user);
      setToken(data.token);
      return data.user;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      setUser(data.user);
      setToken(data.token);
      return data.user;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken('');
    localStorage.removeItem('freshcart_user');
    localStorage.removeItem('freshcart_token');
  };

  // Quick Switch for seamless demo/testing
  const switchDemoRole = async (role) => {
    if (role === 'buyer') {
      await login('buyer@freshcart.local', 'password123');
    } else if (role === 'vendor') {
      await login('anand@farmfresh.local', 'password123');
    } else if (role === 'admin') {
      await login('admin@freshcart.local', 'admin123');
    }
  };

  // Browser Geolocation permission request
  const requestCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setBuyerLocation({
            name: 'Device GPS Location',
            latitude: parseFloat(pos.coords.latitude.toFixed(4)),
            longitude: parseFloat(pos.coords.longitude.toFixed(4)),
          });
        },
        (err) => {
          alert('GPS location permission denied. Using RS Puram, Coimbatore default.');
        }
      );
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        buyerLocation,
        setBuyerLocation,
        requestCurrentLocation,
        login,
        register,
        logout,
        switchDemoRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
