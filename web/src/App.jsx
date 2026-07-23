import React, { useState, useEffect } from 'react';
import { POSProvider, usePOS } from './context/POSContext';
import Dashboard from './components/Dashboard';
import MenuManagement from './components/MenuManagement';
import Analytics from './components/Analytics';
import Settings from './components/Settings';
import Drivers from './components/Drivers';
import Coupons from './components/Coupons';
import MyStores from './components/MyStores';
import NewOrderModal from './components/NewOrderModal';
import { ShoppingBag, Store, BarChart3, Settings as SettingsIcon, AlertCircle, Wifi, WifiOff, Download, Menu, X, Bike, Ticket } from 'lucide-react';
import { supabase } from './supabaseClient';
import './App.css';

// Helper to convert VAPID public key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function MainLayout() {
  const [currentPage, setCurrentPage] = useState('orders');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { orders, supabaseConnected, restaurantOpen, settings, setSettings, availableMerchants, logoutMerchant, userRole, superadminName, setActiveIncomingOrder } = usePOS();
  const [pwaInstallPrompt, setPwaInstallPrompt] = useState(null);

  // Handle order query parameter from notifications
  useEffect(() => {
    const handleUrlQuery = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const orderId = params.get('incoming_order_id');
        if (orderId) {
          console.log('[PWA Navigation] Found incoming_order_id in URL:', orderId);
          // First check if it's already in the local orders array
          const existing = orders.find(o => o.id === orderId);
          if (existing) {
            setActiveIncomingOrder(existing);
            setCurrentPage('orders'); // Go to active orders tab
            window.history.replaceState({}, document.title, window.location.pathname);
          } else {
            // Fetch it directly from Supabase
            const { data, error } = await supabase
              .from('orders')
              .select('*')
              .eq('id', orderId)
              .single();
              
            if (error) {
              console.error('[PWA Navigation] Failed to fetch query order:', error);
            } else if (data) {
              console.log('[PWA Navigation] Fetched order from DB:', data);
              setActiveIncomingOrder(data);
              setCurrentPage('orders');
              window.history.replaceState({}, document.title, window.location.pathname);
            }
          }
        }
      } catch (err) {
        console.warn('[PWA Navigation] Error handling URL query:', err);
      }
    };

    handleUrlQuery();
  }, [orders, setActiveIncomingOrder]);
  // Safely read Notification.permission — undefined on iOS Safari browser (not PWA)
  const [notifPermission, setNotifPermission] = useState(() => {
    try { return typeof Notification !== 'undefined' ? Notification.permission : null; } catch { return null; }
  });

  // Listen to PWA installability prompt trigger
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setPwaInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const triggerPwaInstall = async () => {
    if (!pwaInstallPrompt) return;
    pwaInstallPrompt.prompt();
    const { outcome } = await pwaInstallPrompt.userChoice;
    console.log(`[PWA Installation] User decision: ${outcome}`);
    if (outcome === 'accepted') {
      setPwaInstallPrompt(null);
    }
  };

  // Register PWA service worker + subscribe to push if permission already granted
  const registerPushSubscription = async () => {
    try {
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey || typeof Notification === 'undefined') return;
      if (!('serviceWorker' in navigator)) return;
      const activeReg = await navigator.serviceWorker.ready;
      let subscription = await activeReg.pushManager.getSubscription();
      if (subscription) { try { await subscription.unsubscribe(); } catch {} }
      subscription = await activeReg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });
      const subJson = subscription.toJSON();
      const merchantId = settings.merchantId || '6a0f03b4500ed5db150be1a1';
      await supabase.from('push_subscriptions').upsert(
        { endpoint: subJson.endpoint, keys: subJson.keys, merchant_id: merchantId },
        { onConflict: 'endpoint' }
      );
      console.log('[PWA Push] Push subscription registered for merchant:', merchantId);
    } catch (err) {
      console.warn('[PWA Push] Subscription failed:', err);
    }
  };

  // Request notification permission (called from button tap — required by iOS)
  const enablePushNotifications = async () => {
    try {
      if (typeof Notification === 'undefined') {
        alert('Push notifications require the app to be Added to Home Screen on iOS 16.4+');
        return;
      }
      
      let perm;
      try {
        perm = await Notification.requestPermission();
      } catch (promiseErr) {
        perm = await new Promise((resolve) => {
          Notification.requestPermission(resolve);
        });
      }
      
      setNotifPermission(perm);
      if (perm === 'granted') {
        await registerPushSubscription();
        alert('✅ Push notifications enabled! You will receive alerts for new orders.');
      } else {
        alert('❌ Permission not granted. Please allow notifications in iPhone Settings → Spoonful POS → Notifications.');
      }
    } catch (err) {
      console.warn('[PWA Push] Permission request failed:', err);
    }
  };

  useEffect(() => {
    let controllerChangeCleanup = () => {};
    if ('serviceWorker' in navigator) {
      const handleControllerChange = () => { window.location.reload(); };
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
      controllerChangeCleanup = () => navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);

      const registerSW = async () => {
        try {
          await navigator.serviceWorker.register('/sw.js');
          // Auto-subscribe if already granted (returning user)
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            await registerPushSubscription();
          }
        } catch (err) {
          console.warn('[PWA SW] Registration failed:', err);
        }
      };

      if (document.readyState === 'complete') {
        registerSW();
        return () => { controllerChangeCleanup(); };
      } else {
        window.addEventListener('load', registerSW);
        return () => { window.removeEventListener('load', registerSW); controllerChangeCleanup(); };
      }
    }
  }, [settings.merchantId]);

  // Compute active order count for notification badge in sidebar
  const activeOrdersCount = orders.filter(o => {
    const status = (o.status || '').toLowerCase();
    return status === 'incoming' || status === 'preparing';
  }).length;

  const activeMerchant = availableMerchants.find(m => m.id === settings.merchantId) || { name: 'Spoonful' };

  const navItems = [
    { id: 'orders', icon: ShoppingBag, label: 'Active Orders', badge: activeOrdersCount },
    ...(userRole === 'superadmin' ? [{ id: 'stores', icon: Store, label: 'My Stores' }] : []),
    { id: 'menu', icon: Store, label: 'Storefront Menu' },
    { id: 'drivers', icon: Bike, label: 'Couriers' },
    { id: 'coupons', icon: Ticket, label: 'VIP Coupons' },
    { id: 'analytics', icon: BarChart3, label: 'Analytics' },
    { id: 'settings', icon: SettingsIcon, label: 'Settings' },
  ];

  const navigateTo = (page) => {
    setCurrentPage(page);
    setMobileNavOpen(false);
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen overflow-hidden bg-slate-50">
      
      {/* ── Mobile Full-Screen Nav Overlay ── */}
      {mobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-[200] bg-slate-950 flex flex-col">
          {/* Overlay header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 shrink-0">
            <div className="flex items-center space-x-3">
              <img src="/favicon.png" alt="Spoonful Logo" className="w-8 h-8 rounded-lg object-cover" />
              <div>
                <p className="font-extrabold text-sm tracking-wide text-brand-orange leading-tight">
                  {activeMerchant.name ? activeMerchant.name.toUpperCase() : 'SPOONFUL'}
                </p>
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Kitchen Orderpad</span>
              </div>
            </div>
            <button
              onClick={() => setMobileNavOpen(false)}
              className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 active:scale-90 transition-all"
            >
              <X size={20} />
            </button>
          </div>

          {availableMerchants.length > 1 && (
            <div className="px-5 py-3.5 bg-slate-900/50 border-b border-slate-800 shrink-0">
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">
                Switch Restaurant Context
              </label>
              <select
                value={settings.merchantId}
                onChange={(e) => setSettings(prev => ({ ...prev, merchantId: e.target.value }))}
                className="bg-slate-800 text-white text-xs font-bold rounded-xl border border-slate-700 px-3 py-2.5 focus:outline-none cursor-pointer w-full"
              >
                {availableMerchants.map(m => (
                  <option key={m.id} value={m.id}>{m.name || m.id}</option>
                ))}
              </select>
            </div>
          )}

          {/* Nav items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {navItems.map(({ id, icon: Icon, label, badge }) => (
              <button
                key={id}
                onClick={() => navigateTo(id)}
                className={`flex items-center space-x-4 w-full px-5 py-4 rounded-2xl font-bold text-base transition-all active:scale-98 ${
                  currentPage === id
                    ? 'bg-brand-orange text-white shadow-lg shadow-brand-orange/20'
                    : 'text-slate-300 bg-slate-900 hover:bg-slate-800'
                }`}
              >
                <Icon size={22} />
                <span className="flex-1 text-left">{label}</span>
                {badge > 0 && (
                  <span className={`text-xs font-extrabold px-2.5 py-1 rounded-full ${
                    currentPage === id ? 'bg-white text-brand-orange' : 'bg-brand-orange text-white'
                  }`}>{badge}</span>
                )}
              </button>
            ))}
          </div>

          {/* Overlay footer */}
          <div className="p-4 border-t border-slate-800 flex flex-col space-y-3 shrink-0">
            {notifPermission !== 'granted' && (
              <button
                onClick={enablePushNotifications}
                className="w-full py-3 px-4 bg-brand-orange text-white font-extrabold rounded-2xl text-sm flex items-center justify-center space-x-2 active:scale-95 transition-all shadow-md shadow-brand-orange/25"
              >
                <span>🔔 Enable Push Notifications</span>
              </button>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {supabaseConnected
                  ? <Wifi size={14} className="text-emerald-500" />
                  : <WifiOff size={14} className="text-red-500" />}
                <span className={`text-xs font-semibold ${supabaseConnected ? 'text-slate-400' : 'text-red-400'}`}>
                  {supabaseConnected ? 'Live Connection' : 'Offline'}
                </span>
                <span className="text-slate-700 text-xs">•</span>
                <div className={`w-2 h-2 rounded-full ${restaurantOpen ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                <span className="text-slate-400 text-xs capitalize">{restaurantOpen ? 'Store Open' : 'Closed'}</span>
              </div>
              <button
                onClick={logoutMerchant}
                className="text-xs font-extrabold text-rose-500 border border-rose-500/30 px-3 py-2 rounded-xl active:scale-95 transition-all"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sidebar / Top Bar ── */}
      <aside className="w-full md:w-64 bg-slate-900 text-white flex flex-col justify-between shrink-0 border-b border-slate-800 md:border-b-0">
        <div className="flex flex-col">
          {/* Header row */}
          <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-800">
            <div className="flex items-center space-x-3">
              <img src="/favicon.png" alt="Spoonful Logo" className="w-8 h-8 md:w-9 md:h-9 rounded-xl object-cover" />
              <div>
                <h1 className="font-extrabold text-sm md:text-base tracking-wide text-brand-orange leading-tight font-sans my-0">
                  {activeMerchant.name ? activeMerchant.name.toUpperCase() : 'SPOONFUL'}
                </h1>
                <span className="text-[9px] md:text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Kitchen Orderpad</span>
                {userRole === 'superadmin' && (
                  <span className="text-[9px] text-yellow-400 font-bold block animate-pulse">👑 {superadminName}</span>
                )}
              </div>
            </div>

            {/* Hamburger button — mobile only */}
            <button
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation menu"
              className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 active:scale-90 transition-all relative"
            >
              <Menu size={20} />
              {activeOrdersCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-orange rounded-full text-[9px] font-extrabold text-white flex items-center justify-center">
                  {activeOrdersCount}
                </span>
              )}
            </button>
          </div>

          {/* Active Store Display — desktop only */}
          <div className="hidden md:flex px-6 py-3.5 border-b border-slate-800/80 bg-slate-950/20 items-center justify-between">
            <div className="flex-1 min-w-0 pr-2">
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-0.5">
                Logged In Store
              </label>
              {availableMerchants.length > 1 ? (
                <select
                  value={settings.merchantId}
                  onChange={(e) => setSettings(prev => ({ ...prev, merchantId: e.target.value }))}
                  className="bg-slate-800 text-white text-[11px] font-bold rounded-lg border border-slate-700 px-2 py-1 focus:outline-none cursor-pointer w-full"
                >
                  {availableMerchants.map(m => (
                    <option key={m.id} value={m.id}>{m.name || m.id}</option>
                  ))}
                </select>
              ) : (
                <span className="text-xs font-bold text-white block truncate max-w-[120px]">
                  {activeMerchant.name || settings.merchantId}
                </span>
              )}
            </div>
            <button
              onClick={logoutMerchant}
              className="text-[10px] font-extrabold text-rose-500 hover:text-rose-400 uppercase tracking-wider transition-all shrink-0"
            >
              Sign Out
            </button>
          </div>

          {/* Navigation Links — desktop only */}
          <nav className="hidden md:flex md:flex-col p-4 space-y-1.5">
            {navItems.map(({ id, icon: Icon, label, badge }) => (
              <button
                key={id}
                onClick={() => navigateTo(id)}
                className={`flex items-center space-x-3 w-full px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                  currentPage === id
                    ? 'bg-brand-orange text-white shadow-md shadow-brand-orange/15'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <Icon size={18} />
                <span className="flex-1 text-left">{label}</span>
                {badge > 0 && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    currentPage === id ? 'bg-white text-brand-orange' : 'bg-brand-orange text-white'
                  }`}>{badge}</span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Sidebar Footer Controls — desktop only */}
        <div className="hidden md:block p-4 border-t border-slate-800 space-y-4">
          {notifPermission !== 'granted' && (
            <button
              onClick={enablePushNotifications}
              className="w-full py-2.5 px-3 bg-brand-orange hover:bg-opacity-95 text-white font-extrabold rounded-xl text-xs flex items-center justify-center space-x-2 transition-all shadow-sm active:scale-95"
            >
              <span>🔔 Enable Push Notifications</span>
            </button>
          )}

          {pwaInstallPrompt && (
            <button
              onClick={triggerPwaInstall}
              className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 transition-all shadow-sm"
            >
              <Download size={14} />
              <span>Install Web App</span>
            </button>
          )}

          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold px-2">
            <div className="flex items-center space-x-1.5">
              {supabaseConnected
                ? <Wifi size={14} className="text-emerald-500" />
                : <WifiOff size={14} className="text-red-500" />}
              <span className={supabaseConnected ? 'text-slate-300' : 'text-red-400'}>
                {supabaseConnected ? 'Live Connection' : 'Offline'}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <div className={`w-2 h-2 rounded-full ${restaurantOpen ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <span className="text-slate-300 capitalize">{restaurantOpen ? 'Store Open' : 'Closed'}</span>
            </div>
          </div>

          <div className="text-[10px] text-slate-600 text-center font-bold">
            SPOONFUL POS CLIENT v1.1.0
          </div>
        </div>
      </aside>

      {/* Main Screen Content Area */}
      <main className="flex-1 overflow-hidden h-full w-full">
        {/* Dashboard manages its own internal scroll */}
        {currentPage === 'orders' && <Dashboard />}
        {/* Other pages need an outer scroll container */}
        {currentPage !== 'orders' && (
          <div className="h-full overflow-y-auto">
            {currentPage === 'stores' && <MyStores />}
            {currentPage === 'menu' && <MenuManagement />}
            {currentPage === 'drivers' && <Drivers />}
            {currentPage === 'coupons' && <Coupons />}
            {currentPage === 'analytics' && <Analytics />}
            {currentPage === 'settings' && <Settings />}
          </div>
        )}
      </main>

    </div>
  );
}


function AuthScreen() {
  const { signUpUser, signInUser, authLoading } = usePOS();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [role, setRole] = useState('admin'); // admin or driver
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    if (isRegisterMode) {
      const res = await signUpUser(email, password, displayName, role);
      setIsLoading(false);
      if (res.success) {
        setSuccessMsg(role === 'driver' 
          ? "Driver account registered successfully! You can now log in." 
          : "Registration successful! You can now log in and manage your restaurants."
        );
        setIsRegisterMode(false);
      } else {
        setErrorMsg(res.error || "Failed to register account.");
      }
    } else {
      const res = await signInUser(email, password);
      setIsLoading(false);
      if (!res.success) {
        setErrorMsg(res.error || "Failed to sign in. Check email and password.");
      }
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen w-screen bg-slate-950">
        <div className="text-white text-xs font-bold uppercase tracking-widest animate-pulse">
          Loading Spoonful Terminal...
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen w-screen bg-gradient-to-tr from-slate-950 via-slate-900 to-slate-800 font-sans p-4">
      <div className="w-full max-w-sm bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col space-y-6 animate-fade-in">
        
        {/* Title Logo */}
        <div className="text-center space-y-2 flex flex-col items-center">
          <img src="/favicon.png" alt="Spoonful Logo" className="w-16 h-16 rounded-2xl object-cover shadow-lg shadow-black/25 mb-1" />
          <h2 className="text-xl font-black text-white tracking-tight uppercase">Spoonful Auth</h2>
          <p className="text-xs text-slate-400 font-medium">
            {isRegisterMode ? "Create your unified credentials profile" : "Log in with your standard credentials"}
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/25 text-rose-450 text-xs font-bold rounded-2xl text-center">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/25 text-emerald-450 text-xs font-bold rounded-2xl text-center">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegisterMode && (
            <>
              {/* Role Select */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">
                  Access Profile Role
                </label>
                <div className="flex space-x-1.5">
                  <button
                    type="button"
                    onClick={() => setRole('admin')}
                    className={`flex-1 py-2.5 text-[10px] font-bold rounded-xl transition-all border ${
                      role === 'admin' 
                        ? 'bg-brand-orange text-white border-brand-orange shadow-md shadow-brand-orange/10' 
                        : 'bg-slate-800/80 text-slate-450 border-slate-700/80 hover:text-white'
                    }`}
                  >
                    Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('superadmin')}
                    className={`flex-1 py-2.5 text-[10px] font-bold rounded-xl transition-all border ${
                      role === 'superadmin' 
                        ? 'bg-brand-orange text-white border-brand-orange shadow-md shadow-brand-orange/10' 
                        : 'bg-slate-800/80 text-slate-450 border-slate-700/80 hover:text-white'
                    }`}
                  >
                    Superadmin
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('driver')}
                    className={`flex-1 py-2.5 text-[10px] font-bold rounded-xl transition-all border ${
                      role === 'driver' 
                        ? 'bg-brand-orange text-white border-brand-orange shadow-md shadow-brand-orange/10' 
                        : 'bg-slate-800/80 text-slate-450 border-slate-700/80 hover:text-white'
                    }`}
                  >
                    Driver
                  </button>
                </div>
              </div>

              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">
                  Full Display Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mario Rossi"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-slate-850 border border-slate-700/80 text-white rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-brand-orange"
                />
              </div>
            </>
          )}

          {/* Email Address */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              placeholder="admin@spoonful.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-850 border border-slate-700/80 text-white rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-brand-orange"
            />
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">
              Password
            </label>
            <input
              type="password"
              required
              minLength="6"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-850 border border-slate-700/80 text-white rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-brand-orange"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-brand-orange hover:bg-opacity-95 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-brand-orange/20 active:scale-95 disabled:bg-slate-750 disabled:text-slate-500"
          >
            {isLoading ? "Processing..." : (isRegisterMode ? "REGISTER ACCOUNT" : "SIGN IN TERMINAL")}
          </button>
        </form>

        {/* Mode Switcher Link */}
        <button
          type="button"
          onClick={() => {
            setIsRegisterMode(!isRegisterMode);
            setErrorMsg('');
            setSuccessMsg('');
          }}
          className="text-xs font-bold text-slate-400 hover:text-white transition-all text-center block w-full underline"
        >
          {isRegisterMode ? "Already have an account? Sign In" : "Need a corporate context? Create Account"}
        </button>

      </div>
    </div>
  );
}

import DriverPortal from './components/DriverPortal';

function AppContent() {
  const { authUser, authLoading, activeDriverOffer, setActiveDriverOffer, assignOrderDriver } = usePOS();
  const hostname = window.location.hostname.toLowerCase();
  const path = window.location.pathname.toLowerCase().replace(/\/$/, '');
  const isDriver = import.meta.env.VITE_APP_MODE === 'driver' || hostname.startsWith('driver.') || hostname.startsWith('courier.') || hostname.startsWith('delivery.') || path === '/driver' || path === '/drivers';

  const handleClaimOffer = async (order) => {
    const loggedDriver = localStorage.getItem('pos_driver_name') || 'John Doe';
    try {
      await assignOrderDriver(order.id, loggedDriver, 15);
      setActiveDriverOffer(null);
    } catch (e) {
      alert("Failed to claim: " + e.message);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen w-screen bg-slate-950">
        <div className="text-white text-xs font-bold uppercase tracking-widest animate-pulse">
          Loading Spoonful Terminal...
        </div>
      </div>
    );
  }

  if (isDriver) {
    return (
      <>
        <DriverPortal />
        
        {/* Unified Driver Offer Notification Popup overlay */}
        {activeDriverOffer && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[150] w-full max-w-sm px-4 animate-bounce-in">
            <div className="bg-slate-900 border border-brand-orange/40 text-slate-100 rounded-3xl p-5 shadow-2xl flex flex-col space-y-3 backdrop-blur-md">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">🛵</span>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-brand-orange">
                    NEW DELIVERY OFFER
                  </span>
                  <h4 className="font-extrabold text-white text-sm truncate">
                    Order #{activeDriverOffer.order_number} from Spoonful
                  </h4>
                </div>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Deliver to: <span className="text-slate-200">{activeDriverOffer.customer_address || "Address unavailable"}</span>
              </p>
              <div className="flex space-x-2 pt-1.5">
                <button
                  onClick={() => handleClaimOffer(activeDriverOffer)}
                  className="flex-1 bg-brand-orange hover:bg-opacity-95 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-all shadow-md active:scale-95"
                >
                  Claim Offer
                </button>
                <button
                  onClick={() => setActiveDriverOffer(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold py-2.5 px-4 rounded-xl transition-all active:scale-95"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  if (!authUser) {
    return <AuthScreen />;
  }

  return (
    <>
      <MainLayout />
      <NewOrderModal />
    </>
  );
}

export default function App() {
  return (
    <POSProvider>
      <AppContent />
    </POSProvider>
  );
}
