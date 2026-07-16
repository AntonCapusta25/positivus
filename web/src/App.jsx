import React, { useState, useEffect } from 'react';
import { POSProvider, usePOS } from './context/POSContext';
import Dashboard from './components/Dashboard';
import MenuManagement from './components/MenuManagement';
import Analytics from './components/Analytics';
import Settings from './components/Settings';
import Drivers from './components/Drivers';
import NewOrderModal from './components/NewOrderModal';
import { ShoppingBag, Store, BarChart3, Settings as SettingsIcon, AlertCircle, Wifi, WifiOff, Download, Menu, X, Bike } from 'lucide-react';
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
  const { orders, supabaseConnected, restaurantOpen, settings, setSettings, availableMerchants, logoutMerchant } = usePOS();
  const [pwaInstallPrompt, setPwaInstallPrompt] = useState(null);

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

  // Register PWA service worker and subscribe to Push notifications
  useEffect(() => {
    let controllerChangeCleanup = () => {};

    if ('serviceWorker' in navigator) {
      const handleControllerChange = () => {
        console.log('[PWA SW] Service worker controller changed. Reloading page for updates...');
        window.location.reload();
      };
      
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
      controllerChangeCleanup = () => {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      };

      const registerSW = async () => {
        try {
          const reg = await navigator.serviceWorker.register('/sw.js');
          console.log('[PWA SW] Service worker registered successfully: ', reg.scope);
          
          // Wait for service worker to be fully active/ready
          const activeReg = await navigator.serviceWorker.ready;
          
          // Subscribe to push notifications if VAPID key is configured
          const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
          console.log('[PWA Push] Loading VAPID Public Key:', vapidPublicKey);
          if (vapidPublicKey) {
            // Request permission
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
              const subscription = await activeReg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
              });
              
              const subJson = subscription.toJSON();
              
              // Save to Supabase push_subscriptions table
              const { error } = await supabase
                .from('push_subscriptions')
                .upsert(
                  { 
                    endpoint: subJson.endpoint, 
                    keys: subJson.keys,
                    merchant_id: settings.merchantId
                  },
                  { onConflict: 'endpoint' }
                );
              
              if (error) {
                console.error('[PWA Push] Failed to save subscription to Supabase:', error);
              } else {
                console.log('[PWA Push] Successfully subscribed device to notifications for merchant:', settings.merchantId);
              }
            } else {
              console.warn('[PWA Push] Notification permission denied');
            }
          }
        } catch (err) {
          console.warn('[PWA SW] Service worker registration/subscription failed: ', err);
        }
      };

      if (document.readyState === 'complete') {
        registerSW();
        return () => {
          controllerChangeCleanup();
        };
      } else {
        const loadHandler = () => {
          registerSW();
        };
        window.addEventListener('load', loadHandler);
        return () => {
          window.removeEventListener('load', loadHandler);
          controllerChangeCleanup();
        };
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
    { id: 'menu', icon: Store, label: 'Storefront Menu' },
    { id: 'drivers', icon: Bike, label: 'Couriers' },
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
              <span className="text-xl">🏠</span>
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
          <div className="p-4 border-t border-slate-800 flex items-center justify-between shrink-0">
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
      )}

      {/* ── Sidebar / Top Bar ── */}
      <aside className="w-full md:w-64 bg-slate-900 text-white flex flex-col justify-between shrink-0 border-b border-slate-800 md:border-b-0">
        <div className="flex flex-col">
          {/* Header row */}
          <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-800">
            <div className="flex items-center space-x-3">
              <span className="text-xl md:text-2xl">🏠</span>
              <div>
                <h1 className="font-extrabold text-sm md:text-base tracking-wide text-brand-orange leading-tight font-sans my-0">
                  {activeMerchant.name ? activeMerchant.name.toUpperCase() : 'SPOONFUL'}
                </h1>
                <span className="text-[9px] md:text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Kitchen Orderpad</span>
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
            <div>
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-0.5">
                Logged In Store
              </label>
              <span className="text-xs font-bold text-white block truncate max-w-[120px]">
                {activeMerchant.name || settings.merchantId}
              </span>
            </div>
            <button
              onClick={logoutMerchant}
              className="text-[10px] font-extrabold text-rose-500 hover:text-rose-400 uppercase tracking-wider transition-all"
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
          {pwaInstallPrompt && (
            <button
              onClick={triggerPwaInstall}
              className="w-full py-2 px-3 bg-brand-orange hover:bg-opacity-95 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 transition-all shadow-sm"
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
            {currentPage === 'menu' && <MenuManagement />}
            {currentPage === 'drivers' && <Drivers />}
            {currentPage === 'analytics' && <Analytics />}
            {currentPage === 'settings' && <Settings />}
          </div>
        )}
      </main>

    </div>
  );
}


function PinLockscreen() {
  const { availableMerchants, loginMerchant, settings, setSettings } = usePOS();
  const [selectedMerchant, setSelectedMerchant] = useState('');
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [shake, setShake] = useState(false);

  // Set default selected merchant once available
  useEffect(() => {
    if (availableMerchants.length > 0) {
      // Find default Spoonful or first one
      const found = availableMerchants.find(m => m.id === 'restaurant_1' || m.id === '6a0f03b4500ed5db150be1a1') || availableMerchants[0];
      setSelectedMerchant(found.id);
    } else {
      setSelectedMerchant(settings.merchantId || 'restaurant_1');
    }
  }, [availableMerchants]);

  const handleKeyPress = (num) => {
    setErrorMsg('');
    if (pin.length < 4) {
      const nextPin = pin + num;
      setPin(nextPin);
      if (nextPin.length === 4) {
        // Automatic confirm
        const res = loginMerchant(selectedMerchant, nextPin);
        if (!res.success) {
          setShake(true);
          setErrorMsg(res.error);
          setPin('');
          setTimeout(() => setShake(false), 500);
        }
      }
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPin('');
    setErrorMsg('');
  };

  return (
    <div className="flex items-center justify-center min-h-screen w-screen bg-gradient-to-tr from-slate-950 via-slate-900 to-slate-800 font-sans p-4">
      <div className="w-full max-w-sm bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col space-y-6">
        
        {/* Title Logo */}
        <div className="text-center space-y-2">
          <div className="text-4xl animate-pulse">🏠</div>
          <h2 className="text-xl font-black text-white tracking-tight uppercase">Spoonful Terminal</h2>
          <p className="text-xs text-slate-400 font-medium">Select your restaurant and input passcode to login</p>
        </div>

        {/* Dropdown Select store */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">
            Store / Restaurant
          </label>
          <div className="relative">
            <select
              value={selectedMerchant}
              onChange={(e) => setSelectedMerchant(e.target.value)}
              className="w-full bg-slate-850 hover:bg-slate-800 border border-slate-700/80 text-white rounded-xl pl-3 pr-8 py-3 text-xs font-extrabold focus:outline-none focus:ring-1 focus:ring-brand-orange cursor-pointer appearance-none transition-all"
            >
              {availableMerchants.map(m => (
                <option key={m.id} value={m.id} className="bg-slate-900 text-white">
                  {m.name || m.id}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
              </svg>
            </div>
          </div>
        </div>

        {/* PIN Indicators */}
        <div className="flex flex-col items-center space-y-3">
          <div className={`flex space-x-3.5 ${shake ? 'animate-shake' : ''}`}>
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`w-4.5 h-4.5 rounded-full border-2 transition-all duration-150 ${
                  pin.length > idx 
                    ? 'bg-brand-orange border-brand-orange scale-110 shadow-lg shadow-brand-orange/30' 
                    : 'border-slate-700 bg-transparent'
                }`}
              />
            ))}
          </div>
          {errorMsg ? (
            <p className="text-xs font-semibold text-rose-500 animate-pulse">{errorMsg}</p>
          ) : (
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Default Pin: 1234</p>
          )}
        </div>

        {/* Keypad Grid */}
        <div className="grid grid-cols-3 gap-2.5 max-w-[280px] mx-auto w-full">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(num.toString())}
              className="h-14 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-2xl text-xl font-bold transition-all active:scale-95"
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleClear}
            className="h-14 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white rounded-2xl text-sm font-extrabold transition-all active:scale-95"
          >
            CLEAR
          </button>
          <button
            onClick={() => handleKeyPress('0')}
            className="h-14 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-2xl text-xl font-bold transition-all active:scale-95"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            className="h-14 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white rounded-2xl text-lg font-bold flex items-center justify-center transition-all active:scale-95"
          >
            ⌫
          </button>
        </div>

      </div>
    </div>
  );
}

import DriverPortal from './components/DriverPortal';

function AppContent() {
  const { authenticatedMerchantId, activeDriverOffer, setActiveDriverOffer, assignOrderDriver } = usePOS();
  const path = window.location.pathname.toLowerCase().replace(/\/$/, '');
  const isDriver = path === '/driver' || path === '/drivers';

  const handleClaimOffer = async (order) => {
    const loggedDriver = localStorage.getItem('pos_driver_name') || 'John Doe';
    try {
      await assignOrderDriver(order.id, loggedDriver, 15);
      setActiveDriverOffer(null);
    } catch (e) {
      alert("Failed to claim: " + e.message);
    }
  };

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

  return (
    <>
      {!authenticatedMerchantId ? <PinLockscreen /> : <MainLayout />}
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
