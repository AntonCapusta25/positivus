import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { supabase } from '../supabaseClient';
const HYPERZOD_API_KEY = import.meta.env.VITE_HYPERZOD_API_KEY;
const HYPERZOD_TENANT_ID = import.meta.env.VITE_HYPERZOD_TENANT_ID;
const HYPERZOD_MERCHANT_ID = import.meta.env.VITE_HYPERZOD_MERCHANT_ID;
const HYPERZOD_BASE_URL = import.meta.env.VITE_HYPERZOD_BASE_URL || 'https://api.hyperzod.app';

export function getDriverUrl(orderId) {
  const customDriverUrl = import.meta.env.VITE_DRIVER_APP_URL;
  if (customDriverUrl) {
    // Strip trailing slash if present
    const cleanUrl = customDriverUrl.replace(/\/$/, '');
    return `${cleanUrl}/?order_id=${orderId}`;
  }
  if (typeof window === 'undefined') {
    return `https://spoonful-pos.vercel.app/driver?order_id=${orderId}`;
  }
  const origin = window.location.origin;
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;

  // Check if subdomain format, e.g. admin.yourdomain.com
  if (hostname.includes('.') && !hostname.startsWith('localhost') && !/^\d{1,3}\.\d{1,3}/.test(hostname)) {
    const parts = hostname.split('.');
    if (parts.length >= 3) {
      parts[0] = 'driver';
      return `${protocol}//${parts.join('.')}/?order_id=${orderId}`;
    } else {
      return `${protocol}//driver.${hostname}/?order_id=${orderId}`;
    }
  }

  // Fallback for localhost or default path routing
  return `${origin}/driver?order_id=${orderId}`;
}

const POSContext = createContext();

const initialMenuItems = [
  {
    id: 'cat-1',
    name: 'Pizzas',
    items: [
      { id: 'item-1', name: 'Pizza Margherita', price: 12.50, inStock: true },
      { id: 'item-2', name: 'Veggie Pizza', price: 12.99, inStock: true },
      { id: 'item-3', name: 'Double Pepperoni Pizza', price: 14.50, inStock: true }
    ]
  },
  {
    id: 'cat-2',
    name: 'Burgers',
    items: [
      { id: 'item-4', name: 'Double Beef Burger', price: 9.99, inStock: true },
      { id: 'item-5', name: 'Crispy Chicken Burger', price: 8.99, inStock: true }
    ]
  }
];

export const POSProvider = ({ children }) => {
  const [userRole, setUserRole] = useState(() => {
    return localStorage.getItem('pos_user_role') || 'admin';
  });

  const [superadminName, setSuperadminName] = useState(() => {
    return localStorage.getItem('pos_superadmin_name') || null;
  });

  const [orders, setOrders] = useState([]);
  const [supabaseConnected, setSupabaseConnected] = useState(false);
  const [restaurantOpen, setRestaurantOpen] = useState(true);
  const [availableMerchants, setAvailableMerchants] = useState([]);
  const [activeIncomingOrder, setActiveIncomingOrder] = useState(null);
  const [activeDriverOffer, setActiveDriverOffer] = useState(null);
  const [drivers, setDrivers] = useState(() => {
    const saved = localStorage.getItem('pos_drivers');
    return saved ? JSON.parse(saved) : [
      { id: 'drv-1', name: 'John Doe', passcode: '1234', phone: '+31612345678' },
      { id: 'drv-2', name: 'Jane Smith', passcode: '1234', phone: '+31687654321' },
      { id: 'drv-3', name: 'Carlos V.', passcode: '1234', phone: '+31655555555' }
    ];
  });
  const [menuItems, setMenuItems] = useState(() => {
    const saved = localStorage.getItem('pos_menu_items');
    return saved ? JSON.parse(saved) : initialMenuItems;
  });

  const defaultMerchantId = HYPERZOD_MERCHANT_ID;

  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('pos_settings');
    const parsed = saved ? JSON.parse(saved) : {};
    return {
      merchantId: parsed.merchantId || defaultMerchantId,
      receiptCopies: parsed.receiptCopies || 2, // Default to 2 copies since user wants kitchen/driver and customer receipts
      autoPrint: parsed.autoPrint !== undefined ? parsed.autoPrint : true,
      soundAlert: parsed.soundAlert !== undefined ? parsed.soundAlert : true,
      soundVolume: parsed.soundVolume !== undefined ? parsed.soundVolume : 80,
      soundTheme: parsed.soundTheme || 'default',
      driverAppTemplate: parsed.driverAppTemplate || 'https://spoonful.com/driver?order={order_id}&address={address}&driver={driver}&time={time}',
      appStoreLink: parsed.appStoreLink || 'https://apps.apple.com/app/spoonful',
      playStoreLink: parsed.playStoreLink || 'https://play.google.com/store/apps/details?id=com.spoonful',
      customiseReceipt: parsed.customiseReceipt || {
        itemIds: true,
        address: true,
        phone: true,
        categories: true
      },
      enlargeReceiptText: parsed.enlargeReceiptText || {
        orderNo: true,
        address: false,
        phone: false,
        notes: false
      }
    };
  });

  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Save configurations to localStorage
  useEffect(() => {
    localStorage.setItem('pos_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('pos_menu_items', JSON.stringify(menuItems));
  }, [menuItems]);

  // Self-healing startup catalog and storefront sync with Hyperzod
  const syncCatalogAndStorefront = async () => {
    if (!HYPERZOD_API_KEY || !HYPERZOD_TENANT_ID) {
      console.warn("Hyperzod API Key/Tenant not set, skipping catalog pull.");
      return;
    }

    const headers = {
      'X-API-KEY': HYPERZOD_API_KEY,
      'X-TENANT': HYPERZOD_TENANT_ID,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };

    try {
      console.log("Hyperzod initial sync triggered...");

      // 1. Fetch merchant details
      const mListRes = await fetch(`${HYPERZOD_BASE_URL}/admin/v1/merchant/list`, { headers });
      const mListData = await mListRes.json();
      
      let activeId = settings.merchantId || HYPERZOD_MERCHANT_ID;

      if (mListData.success && mListData.data && mListData.data.data) {
        const list = mListData.data.data || [];
        setAvailableMerchants(list);

        // Sync database merchants table for all merchants
        const merchantsToUpsert = list.map(m => ({
          merchant_id: m.id,
          name: m.name,
          is_open: m.is_open,
          is_accepting_orders: m.is_accepting_orders,
          slug: m.slug,
          raw_details: m,
          updated_at: new Date().toISOString()
        }));

        if (merchantsToUpsert.length > 0) {
          const { error } = await supabase
            .from('merchants')
            .upsert(merchantsToUpsert, { onConflict: 'merchant_id' });
          if (error) console.error("Failed to upsert merchants to Supabase:", error.message);
        }

        // If settings has no merchant or the current one is not in the list (e.g. legacy localStore), fallback to first
        const isMerchantInList = list.some(m => m.id === settings.merchantId);
        if ((!settings.merchantId || !isMerchantInList) && list.length > 0) {
          activeId = list[0].id;
          setSettings(prev => ({ ...prev, merchantId: activeId }));
        }

        const merchantObj = list.find(m => m.id === activeId);
        if (merchantObj) {
          console.log("Merchant storefront details fetched:", merchantObj.name);
          setRestaurantOpen(merchantObj.is_accepting_orders);
        }
      }

      // 2. Fetch product categories for the active merchant
      const catRes = await fetch(`${HYPERZOD_BASE_URL}/merchant/v1/catalog/product-category/list?merchant_id=${activeId}`, { headers });
      const catData = await catRes.json();

      // 3. Fetch products list for the active merchant
      const prodRes = await fetch(`${HYPERZOD_BASE_URL}/merchant/v1/catalog/product/list?merchant_id=${activeId}`, { headers });
      const prodData = await prodRes.json();

      if (catData.success && prodData.success) {
        const rawCategories = Array.isArray(catData.data) ? catData.data : (catData.data?.data || []);
        const rawProducts = Array.isArray(prodData.data) ? prodData.data : (prodData.data?.data || []);

        console.log(`Self-healing catalog sync for merchant ${activeId}: ${rawCategories.length} categories, ${rawProducts.length} items.`);

        // Upsert to Supabase products table
        const productsToUpsert = rawProducts.map(p => {
          const categoryName = rawCategories.find(c => c.id === p.product_category?.[0])?.name || 'Uncategorized';
          return {
            product_id: p.id,
            merchant_id: activeId,
            name: p.name,
            price: Number(p.price || 0),
            in_stock: p.in_stock !== false,
            category_id: p.product_category?.[0] || 'uncategorized',
            category_name: categoryName,
            updated_at: new Date().toISOString()
          };
        });

        if (productsToUpsert.length > 0) {
          const { error } = await supabase
            .from('products')
            .upsert(productsToUpsert, { onConflict: 'product_id' });
          if (error) console.error("Failed to upsert products to Supabase:", error.message);
        }

        // Map and set local UI state
        const mappedMenuItems = rawCategories.map(cat => {
          return {
            id: cat.id,
            name: cat.name,
            items: rawProducts
              .filter(p => p.product_category?.includes(cat.id))
              .map(p => ({
                id: p.id,
                name: p.name,
                price: Number(p.price || 0),
                inStock: p.in_stock !== false
              }))
          };
        }).filter(c => c.items.length > 0);

        setMenuItems(mappedMenuItems);
      }
    } catch (e) {
      console.error("Self-healing background catalog sync failed:", e);
    }
  };

  useEffect(() => {
    // Clear menuItems when switching merchants to show loading state
    setMenuItems([]);
    syncCatalogAndStorefront();
  }, [settings.merchantId]);

  // Fetch initial orders and listen to realtime updates from Supabase
  useEffect(() => {
    if (!settings.merchantId) return;
    setSupabaseConnected(true);

    const fetchOrders = async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('merchant_id', settings.merchantId)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;
        setOrders(data || []);
      } catch (err) {
        console.error('Supabase fetch error:', err);
      }
    };

    fetchOrders();

    // Subscribe to public.orders postgres change replication
    const ordersChannel = supabase
      .channel('realtime:pos_orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `merchant_id=eq.${settings.merchantId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newOrder = payload.new;
            setOrders((prev) => {
              if (prev.some(o => o.id === newOrder.id)) return prev;
              
              // 1. Admin sound / modal alert
              if (settingsRef.current.soundAlert) {
                startSirenAlert();
              }
              setActiveIncomingOrder(newOrder);

              // 1.5 Auto-print if enabled
              if (settingsRef.current.autoPrint) {
                triggerTestPrint(newOrder);
              }

              // 2. Driver sound / popup offer notification (if unassigned delivery)
              const isDelivery = (newOrder.type || '').toLowerCase() === 'delivery';
              const isUnassigned = !newOrder.driver_name || newOrder.driver_name === '';
              if (isDelivery && isUnassigned) {
                setActiveDriverOffer(newOrder);
                playDriverChime();
              }

              return [newOrder, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedOrder = payload.new;
            setOrders((prev) => {
              const matchedPrev = prev.find(o => o.id === updatedOrder.id);
              
              // Driver notification: if status changed to ready/preparing and is unassigned delivery
              const isDelivery = (updatedOrder.type || '').toLowerCase() === 'delivery';
              const isUnassigned = !updatedOrder.driver_name || updatedOrder.driver_name === '';
              const statusChanged = matchedPrev && matchedPrev.status !== updatedOrder.status;
              const isNowAvailable = updatedOrder.status === 'ready' || updatedOrder.status === 'preparing';

              if (isDelivery && isUnassigned && statusChanged && isNowAvailable) {
                setActiveDriverOffer(updatedOrder);
                playDriverChime();
              }

              return prev.map(o => o.id === updatedOrder.id ? updatedOrder : o);
            });
          } else if (payload.eventType === 'DELETE') {
            setOrders((prev) => prev.filter(o => o.id !== payload.old.id));
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setSupabaseConnected(true);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setSupabaseConnected(false);
        }
      });

    return () => {
      supabase.removeChannel(ordersChannel);
    };
  }, [settings.merchantId, settings.soundAlert, settings.soundVolume]);

  // Realtime Database sync subscription for merchant storefront and catalog status
  useEffect(() => {
    if (!settings.merchantId) return;
    const activeMerchantId = settings.merchantId;

    const merchantsChannel = supabase
      .channel('realtime:pos_merchants')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'merchants', filter: `merchant_id=eq.${activeMerchantId}` },
        (payload) => {
          console.log("Realtime storefront update received from database:", payload.new);
          setRestaurantOpen(payload.new.is_accepting_orders);
        }
      )
      .subscribe();

    const productsChannel = supabase
      .channel('realtime:pos_products')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'products', filter: `merchant_id=eq.${activeMerchantId}` },
        (payload) => {
          console.log("Realtime product stock update received from database:", payload.new);
          const { product_id, in_stock } = payload.new;
          setMenuItems(prev => prev.map(cat => ({
            ...cat,
            items: cat.items.map(item => 
              item.id === product_id ? { ...item, inStock: in_stock } : item
            )
          })));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(merchantsChannel);
      supabase.removeChannel(productsChannel);
    };
  }, [settings.merchantId]);

  // Realtime Database sync subscription for drivers credentials
  useEffect(() => {
    if (!settings.merchantId) return;
    const activeMerchantId = settings.merchantId;

    const fetchDrivers = async () => {
      try {
        let query = supabase.from('drivers').select('*');
        if (userRole !== 'superadmin') {
          query = query.eq('merchant_id', activeMerchantId);
        }
        const { data, error } = await query.order('name', { ascending: true });
        
        if (error) {
          console.warn("Could not load drivers from Supabase, using local defaults:", error.message);
          return;
        }
        if (data) {
          setDrivers(data);
          localStorage.setItem('pos_drivers', JSON.stringify(data));
        }
      } catch (err) {
        console.warn("Error fetching drivers:", err);
      }
    };

    fetchDrivers();

    const channelName = userRole === 'superadmin' ? 'realtime:pos_drivers_all' : 'realtime:pos_drivers_' + activeMerchantId;
    const changeFilter = userRole === 'superadmin'
      ? { event: '*', schema: 'public', table: 'drivers' }
      : { event: '*', schema: 'public', table: 'drivers', filter: `merchant_id=eq.${activeMerchantId}` };

    const driversChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        changeFilter,
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newD = payload.new;
            setDrivers(prev => {
              if (prev.some(d => d.id === newD.id)) return prev;
              const updated = [...prev, newD];
              localStorage.setItem('pos_drivers', JSON.stringify(updated));
              return updated;
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedD = payload.new;
            setDrivers(prev => {
              const updated = prev.map(d => d.id === updatedD.id ? updatedD : d);
              localStorage.setItem('pos_drivers', JSON.stringify(updated));
              return updated;
            });
          } else if (payload.eventType === 'DELETE') {
            const oldId = payload.old.id;
            setDrivers(prev => {
              const updated = prev.filter(d => d.id !== oldId);
              localStorage.setItem('pos_drivers', JSON.stringify(updated));
              return updated;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(driversChannel);
    };
  }, [settings.merchantId, userRole]);


  // Global AudioContext for mobile web browser compatibility (bypasses gesture restrictions)
  const globalAudioCtxRef = useRef(null);

  useEffect(() => {
    const initAudioContext = () => {
      if (!globalAudioCtxRef.current) {
        globalAudioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = globalAudioCtxRef.current;
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().then(() => {
          console.log('[POS Audio] AudioContext unlocked successfully');
          cleanup();
        }).catch(err => {
          console.warn('[POS Audio] Failed to resume AudioContext:', err);
        });
      } else if (ctx && ctx.state === 'running') {
        cleanup();
      }
    };

    const cleanup = () => {
      window.removeEventListener('click', initAudioContext);
      window.removeEventListener('touchstart', initAudioContext);
    };

    window.addEventListener('click', initAudioContext);
    window.addEventListener('touchstart', initAudioContext);

    return cleanup;
  }, []);

  // Looping Siren Alarm alert state
  const [sirenActive, setSirenActive] = useState(false);
  const sirenIntervalRef = useRef(null);

  const startSirenAlert = () => {
    if (!settings.soundAlert) return;
    setSirenActive(true);
  };

  const stopSirenAlert = () => {
    setSirenActive(false);
  };

  const playDriverChime = () => {
    if (!settings.soundAlert) return;
    try {
      const audioCtx = globalAudioCtxRef.current || new (window.AudioContext || window.webkitAudioContext)();
      if (!globalAudioCtxRef.current) globalAudioCtxRef.current = audioCtx;

      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime);
      osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.12);
      
      gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
      
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } catch (e) {
      console.warn("Audio play failed:", e);
    }
  };

  useEffect(() => {
    if (sirenActive) {
      try {
        const audioCtx = globalAudioCtxRef.current || new (window.AudioContext || window.webkitAudioContext)();
        if (!globalAudioCtxRef.current) globalAudioCtxRef.current = audioCtx;

        let highTone = true;

        sirenIntervalRef.current = setInterval(() => {
          if (audioCtx.state === 'suspended') {
            audioCtx.resume();
          }
          const osc = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          osc.connect(gainNode);
          gainNode.connect(audioCtx.destination);

          // Alternating siren tones: 880Hz and 1200Hz
          osc.type = 'sawtooth';
          const freq = highTone ? 1200 : 880;
          osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

          const volume = (settings.soundVolume / 100) * 0.5;
          gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.22);

          osc.start();
          osc.stop(audioCtx.currentTime + 0.24);
          highTone = !highTone;
        }, 250);
      } catch (e) {
        console.warn('HTML5 AudioContext failed to start for siren:', e);
      }
    } else {
      if (sirenIntervalRef.current) {
        clearInterval(sirenIntervalRef.current);
        sirenIntervalRef.current = null;
      }
    }

    return () => {
      if (sirenIntervalRef.current) {
        clearInterval(sirenIntervalRef.current);
      }
    };
  }, [sirenActive, settings.soundVolume, settings.soundAlert]);

  // PIN Authentication State
  const [authenticatedMerchantId, setAuthenticatedMerchantId] = useState(() => {
    return localStorage.getItem('pos_authenticated_merchant') || null;
  });

  const loginMerchant = (merchantId, pin) => {
    const cleanPin = pin.trim();

    // Check if logging in as Superadmin
    if (merchantId === 'superadmin_autoflow' || merchantId === 'superadmin_raj' || merchantId === 'AutoFlow' || merchantId === 'Raj') {
      const name = (merchantId === 'superadmin_autoflow' || merchantId === 'AutoFlow') ? 'AutoFlow' : 'Raj';
      if (cleanPin === '1234' || cleanPin === '9999') {
        setUserRole('superadmin');
        setSuperadminName(name);
        localStorage.setItem('pos_user_role', 'superadmin');
        localStorage.setItem('pos_superadmin_name', name);

        // Pick default logged in merchant (first one) or fallback
        const defaultId = availableMerchants[0]?.id || 'restaurant_1';
        setAuthenticatedMerchantId(defaultId);
        localStorage.setItem('pos_authenticated_merchant', defaultId);
        setSettings(prev => ({ ...prev, merchantId: defaultId }));
        return { success: true };
      }
      return { success: false, error: 'Incorrect Superadmin PIN passcode. Please try again.' };
    }

    // Standard Merchant login check
    const isSpoonful = merchantId === 'restaurant_1' || merchantId === '6a0f03b4500ed5db150be1a1';
    const last4 = merchantId.slice(-4);
    const validPins = ['1234'];
    if (last4) validPins.push(last4);

    if (cleanPin === '1234' || (isSpoonful && cleanPin === '1234') || validPins.includes(cleanPin)) {
      setUserRole('admin');
      setSuperadminName(null);
      localStorage.setItem('pos_user_role', 'admin');
      localStorage.removeItem('pos_superadmin_name');

      setAuthenticatedMerchantId(merchantId);
      localStorage.setItem('pos_authenticated_merchant', merchantId);
      setSettings(prev => ({ ...prev, merchantId }));
      return { success: true };
    }

    return { success: false, error: 'Incorrect PIN passcode. Please try again.' };
  };

  const logoutMerchant = () => {
    setAuthenticatedMerchantId(null);
    setUserRole('admin');
    setSuperadminName(null);
    localStorage.removeItem('pos_authenticated_merchant');
    localStorage.removeItem('pos_user_role');
    localStorage.removeItem('pos_superadmin_name');
  };

  const createDriver = async (name, passcode, phone) => {
    const cleanName = name.trim();
    const cleanPasscode = passcode.trim();
    if (!cleanName || !cleanPasscode) {
      return { success: false, error: 'Name and passcode are required.' };
    }

    const newDriver = {
      id: crypto.randomUUID ? crypto.randomUUID() : 'drv-' + Math.random().toString(36).substring(2, 9),
      merchant_id: settings.merchantId,
      name: cleanName,
      passcode: cleanPasscode,
      phone: phone || ''
    };

    try {
      const { error } = await supabase
        .from('drivers')
        .insert([newDriver]);

      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('relation "drivers" does not exist')) {
          console.warn("Supabase drivers table missing, inserting locally");
        } else {
          throw error;
        }
      }
    } catch (err) {
      console.error("Failed to insert driver in Supabase:", err);
    }

    setDrivers(prev => {
      const updated = [...prev.filter(d => d.name.toLowerCase() !== cleanName.toLowerCase()), newDriver];
      localStorage.setItem('pos_drivers', JSON.stringify(updated));
      return updated;
    });

    return { success: true, driver: newDriver };
  };

  const deleteDriver = async (driverId) => {
    try {
      await supabase
        .from('drivers')
        .delete()
        .eq('id', driverId);
    } catch (err) {
      console.error("Failed to delete driver from Supabase:", err);
    }

    setDrivers(prev => {
      const updated = prev.filter(d => d.id !== driverId);
      localStorage.setItem('pos_drivers', JSON.stringify(updated));
      return updated;
    });

    return { success: true };
  };

  // Helper sound function (synthesized browser audio context)
  const playAlertSound = () => {
    try {
      const audioCtx = globalAudioCtxRef.current || new (window.AudioContext || window.webkitAudioContext)();
      if (!globalAudioCtxRef.current) globalAudioCtxRef.current = audioCtx;

      const volume = settings.soundVolume / 100;
      
      const playTone = (freq, duration, delay) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);
        gainNode.gain.setValueAtTime(volume, audioCtx.currentTime + delay);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + delay + duration);
        
        osc.start(audioCtx.currentTime + delay);
        osc.stop(audioCtx.currentTime + delay + duration);
      };

      if (settings.soundTheme === 'quiet') {
        playTone(523.25, 0.3, 0);
        playTone(659.25, 0.4, 0.25);
      } else if (settings.soundTheme === 'noisy') {
        playTone(880, 0.15, 0);
        playTone(987.77, 0.15, 0.12);
        playTone(1046.50, 0.25, 0.24);
      } else {
        playTone(587.33, 0.4, 0);
        playTone(880, 0.5, 0.2);
      }
    } catch (e) {
      console.warn('HTML5 AudioContext not supported or blocked by user gesture:', e);
    }
  };

  // Assign driver details to order (with race condition protection)
  const assignOrderDriver = async (orderId, driverName, deliveryDuration) => {
    try {
      // Atomic check-and-set: update only if driver_name is null or empty
      const { data, error } = await supabase
        .from('orders')
        .update({ 
          driver_name: driverName, 
          delivery_duration: deliveryDuration 
        })
        .eq('id', orderId)
        .or('driver_name.is.null,driver_name.eq.""')
        .select();

      if (error) throw error;

      // If no rows matched, it means someone else already claimed it
      if (!data || data.length === 0) {
        const { data: ord } = await supabase
          .from('orders')
          .select('driver_name')
          .eq('id', orderId)
          .maybeSingle();
        
        const currentDriver = ord?.driver_name || "another driver";
        throw new Error(`This order has already been claimed by ${currentDriver}.`);
      }

      // Database write succeeded, now update local React state
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, driver_name: driverName, delivery_duration: deliveryDuration } : o));
      return { success: true };
    } catch (err) {
      console.error('Update driver details in Supabase failed:', err);
      return { success: false, error: err.message };
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      // Database write succeeded, now update local React state
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    } catch (err) {
      console.error('Update status in Supabase failed:', err);
      alert('Failed to update status: ' + err.message);
      return;
    }

    // Propagate status update back to Hyperzod via server-side Supabase Edge Function to avoid client CORS restrictions
    let matchedOrder = orders.find(o => o.id === orderId || o.order_number === orderId);
    
    if (!matchedOrder) {
      try {
        const { data } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .maybeSingle();
        matchedOrder = data;
      } catch (err) {
        console.error('Failed to fetch matched order from DB:', err);
      }
    }

    if (matchedOrder && matchedOrder.order_number) {
      let isSynced = false;
      try {
        console.log(`Propagating order status change to Hyperzod via Edge Function: Order ${matchedOrder.order_number} -> ${newStatus}`);
        const { data, error } = await supabase.functions.invoke('hyperzod-sync', {
          body: {
            table: 'orders',
            type: 'UPDATE',
            record: {
              order_number: matchedOrder.order_number,
              status: newStatus
            },
            hyperzod_api_key: HYPERZOD_API_KEY,
            hyperzod_tenant_id: HYPERZOD_TENANT_ID
          }
        });
        if (!error) {
          console.log('Hyperzod status update via Deno sync success:', data);
          isSynced = true;
        } else {
          console.warn("Edge function returned error payload, falling back to proxy...", error);
        }
      } catch (err) {
        console.warn("Failed to propagate status update to Hyperzod via edge function, trying proxy...", err);
      }

      // Local Proxy Fallback (Bypasses CORS in development using Vite dev server proxy!)
      if (!isSynced) {
        const hyperzodOrderId = parseInt(matchedOrder.order_number, 10);
        if (!isNaN(hyperzodOrderId)) {
          const mapSpoonfulStatusToHyperzod = (status) => {
            switch (status.toLowerCase()) {
              case 'incoming':
              case 'pending':
                return 1;
              case 'preparing':
              case 'accepted':
                return 2;
              case 'ready':
                return 3;
              case 'collected':
              case 'dispatched':
                return 4;
              case 'completed':
                return 5;
              case 'cancelled':
              case 'declined':
                return 6;
              default:
                return 2;
            }
          };

          const hyperzodStatus = mapSpoonfulStatusToHyperzod(newStatus);
          try {
            console.log(`Propagating status to Hyperzod via Local Proxy: ID ${hyperzodOrderId} -> status ${hyperzodStatus}`);
            const response = await fetch(`/api/hyperzod/admin/v1/order/update-order-status`, {
              method: 'POST',
              headers: {
                'X-API-KEY': HYPERZOD_API_KEY,
                'X-TENANT': HYPERZOD_TENANT_ID,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                order_id: hyperzodOrderId,
                order_status: hyperzodStatus
              })
            });
            const resJson = await response.json();
            if (resJson.success || resJson.message?.toLowerCase().includes("already set to")) {
              console.log(`Hyperzod status update via local proxy response (Success/Already Set):`, resJson);
            } else {
              console.warn(`Hyperzod status update via local proxy response failed:`, resJson);
            }
          } catch (err) {
            console.warn("Failed to propagate status update via local proxy:", err);
          }
        }
      }
    }
  };

  const updateOrderPrinted = async (orderId, printedState) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, printed: printedState } : o));

    try {
      const { error } = await supabase
        .from('orders')
        .update({ printed: printedState })
        .eq('id', orderId);

      if (error) throw error;
    } catch (err) {
      console.error('Update print state in Supabase failed:', err);
    }
  };

  const toggleRestaurantOpen = async () => {
    const nextOpenState = !restaurantOpen;
    setRestaurantOpen(nextOpenState);

    // 1. Update Supabase merchants table (Single Source of Truth)
    try {
      const { error } = await supabase
        .from('merchants')
        .update({ 
          is_accepting_orders: nextOpenState,
          is_open: nextOpenState,
          updated_at: new Date().toISOString()
        })
        .eq('merchant_id', defaultMerchantId);

      if (error) throw error;
    } catch (err) {
      console.warn('Database-level storefront status update failed. Proceeding with client fallback.');
    }

    // 2. Client-side direct Hyperzod update fallback
    try {
      const mListRes = await fetch(`${HYPERZOD_BASE_URL}/admin/v1/merchant/list`, {
        headers: {
          'X-API-KEY': HYPERZOD_API_KEY,
          'X-TENANT': HYPERZOD_TENANT_ID,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      const mListData = await mListRes.json();
      if (mListData.success && mListData.data && mListData.data.data) {
        const raw = mListData.data.data.find(m => m.id === defaultMerchantId) || {};
        
        const updatePayload = {
          id: defaultMerchantId,
          name: raw.name || "Spoonful",
          slug: raw.slug || "raj-curry-house",
          phone: raw.phone,
          email: raw.email,
          address: raw.address,
          post_code: raw.post_code,
          city: raw.city,
          country: raw.country,
          country_code: raw.country_code,
          delivery_by: raw.delivery_by,
          accepted_order_types: raw.accepted_order_types || ["delivery", "pickup", "custom_1"],
          status: raw.status ? 1 : 0,
          tax_method: raw.tax_method || "exclusive",
          language_translation: raw.language_translation || [],
          is_accepting_orders: nextOpenState,
          is_open: nextOpenState,
          commission: [
            { order_type: "delivery", type: "percentage", percent_value: 0, calculate_on_status: 5 },
            { order_type: "pickup", type: "percentage", percent_value: 0, calculate_on_status: 5 },
            { order_type: "custom_1", type: "percentage", percent_value: 0, calculate_on_status: 5 }
          ]
        };

        await fetch(`${HYPERZOD_BASE_URL}/admin/v1/merchant/update`, {
          method: 'POST',
          headers: {
            'X-API-KEY': HYPERZOD_API_KEY,
            'X-TENANT': HYPERZOD_TENANT_ID,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updatePayload)
        });
        console.log(`[Hyperzod Sync Success] Storefront open status toggled to: ${nextOpenState}`);
      }
    } catch (e) {
      console.error('[Hyperzod Sync Error] Toggling storefront closed failed:', e);
    }
  };

  const toggleItemStock = async (categoryId, itemId) => {
    let currentStockState = true;
    const activeMerchantId = settings.merchantId || HYPERZOD_MERCHANT_ID;

    setMenuItems(prev => prev.map(cat => {
      if (cat.id !== categoryId) return cat;
      return {
        ...cat,
        items: cat.items.map(item => {
          if (item.id !== itemId) return item;
          currentStockState = !item.inStock;
          return { ...item, inStock: currentStockState };
        })
      };
    }));

    // 1. Update Supabase products table (Single Source of Truth)
    try {
      const { error } = await supabase
        .from('products')
        .update({ 
          in_stock: currentStockState,
          updated_at: new Date().toISOString()
        })
        .eq('product_id', itemId);

      if (error) throw error;
    } catch (err) {
      console.warn('Database-level stock status update failed. Proceeding with client fallback.');
    }

    // 2. Client-side direct Hyperzod update fallback
    try {
      const updatePayload = {
        merchant_id: activeMerchantId,
        stock_counts: [
          {
            product_id: itemId,
            stock_count: currentStockState ? 500 : 0
          }
        ]
      };
      await fetch(`${HYPERZOD_BASE_URL}/merchant/v1/catalog/product/stock/updateCountBulk`, {
        method: 'POST',
        headers: {
          'X-API-KEY': HYPERZOD_API_KEY,
          'X-TENANT': HYPERZOD_TENANT_ID,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatePayload)
      });
      console.log(`[Hyperzod Sync Success] Item ${itemId} stock count updated to: ${currentStockState ? 500 : 0}`);
    } catch (e) {
      console.error('[Hyperzod Sync Error] Updating item stock failed:', e);
    }
  };

  const acceptOrder = async (orderId, prepTime) => {
    // Check if the order was already accepted or completed on another device
    try {
      const { data: dbOrder, error: dbError } = await supabase
        .from('orders')
        .select('status')
        .eq('id', orderId)
        .maybeSingle();

      if (dbError) throw dbError;

      if (dbOrder && dbOrder.status !== 'incoming') {
        alert(`This order has already been processed by another device/driver (Current Status: ${dbOrder.status.toUpperCase()}).`);
        setActiveIncomingOrder(null);
        return;
      }
    } catch (err) {
      console.warn("Pre-acceptance status check failed:", err);
    }

    // 1. Update local orders state
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'preparing', preparation_time: prepTime } : o));

    // 2. Update status & prep time in Supabase
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'preparing',
          preparation_time: prepTime
        })
        .eq('id', orderId);

      if (error) throw error;
    } catch (err) {
      console.error('Accepting order in Supabase failed:', err);
    }

    // Propagate acceptance back to Hyperzod via Edge Function to prevent status rollback
    const matchedOrder = orders.find(o => o.id === orderId || o.order_number === orderId);
    if (matchedOrder && matchedOrder.order_number) {
      try {
        console.log(`Propagating order acceptance to Hyperzod: Order ${matchedOrder.order_number}`);
        const { data, error } = await supabase.functions.invoke('hyperzod-sync', {
          body: {
            table: 'orders',
            type: 'UPDATE',
            record: {
              order_number: matchedOrder.order_number,
              status: 'preparing'
            },
            hyperzod_api_key: HYPERZOD_API_KEY,
            hyperzod_tenant_id: HYPERZOD_TENANT_ID
          }
        });
        if (error) throw error;
        console.log('Hyperzod status update via Deno sync success (Accept):', data);
      } catch (err) {
        console.warn("Failed to propagate status update to Hyperzod via edge function:", err);
      }
    }

    // 3. Close the modal overlay
    setActiveIncomingOrder(null);

    // 4. Trigger print
    const orderObj = orders.find(o => o.id === orderId);
    if (orderObj) {
      triggerTestPrint({ ...orderObj, status: 'preparing', preparation_time: prepTime });
    }
  };

  const createTestOrder = async () => {
    try {
      console.log("Triggering test order on Hyperzod for active merchant...");
      
      const activeMerchantId = settings.merchantId || HYPERZOD_MERCHANT_ID;
      
      const headers = {
        'X-API-KEY': HYPERZOD_API_KEY,
        'X-TENANT': HYPERZOD_TENANT_ID,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };
      
      // 1. Fetch products list to pick the first one
      const prodRes = await fetch(`${HYPERZOD_BASE_URL}/merchant/v1/catalog/product/list?merchant_id=${activeMerchantId}`, { headers });
      const prodData = await prodRes.json();
      if (!prodData.success) {
        throw new Error('Failed to fetch products: ' + JSON.stringify(prodData));
      }
      const rawProducts = Array.isArray(prodData.data) ? prodData.data : (prodData.data?.data || []);
      if (rawProducts.length === 0) {
        throw new Error('No products found to place a test order for this merchant.');
      }
      const product = rawProducts[0];

      // 2. Get or create a customer
      const listRes = await fetch(`${HYPERZOD_BASE_URL}/admin/v1/auth/user/all`, { headers });
      const listData = await listRes.json();
      let userId;
      if (listData.success && listData.data?.data?.length > 0) {
        userId = listData.data.data[0].id;
      } else {
        const customerPayload = {
          first_name: 'Test',
          last_name: 'POS User',
          email: 'pos_test@spoonful.com',
          country_code: 'US',
          mobile: '1234567890'
        };
        const createRes = await fetch(`${HYPERZOD_BASE_URL}/admin/v1/auth/user/add`, {
          method: 'POST',
          headers,
          body: JSON.stringify(customerPayload)
        });
        const createData = await createRes.json();
        if (!createData.success) throw new Error('Failed to create customer: ' + JSON.stringify(createData));
        userId = createData.data.id;
      }

      // 3. Create address
      const addressPayload = {
        user_id: userId,
        address_type: 'home',
        location_lat_lon: [52.2215372, 6.8936619],
        address: 'Deurningerstraat 91B, Enschede, NL',
        building: '91B',
        landmark: 'Raj Curry House',
        city: 'Enschede',
        area: 'Deurningerstraat',
        country: 'Netherlands',
        country_code: 'NL'
      };
      const addrRes = await fetch(`${HYPERZOD_BASE_URL}/admin/v1/address/create`, {
        method: 'POST',
        headers,
        body: JSON.stringify(addressPayload)
      });
      const addrData = await addrRes.json();
      if (!addrData.success) throw new Error('Failed to create address: ' + JSON.stringify(addrData));
      const addressId = addrData.data._id;

      // 4. Update cart
      const cartPayload = {
        user_id: userId,
        merchant_id: activeMerchantId,
        type: 'ecommerce',
        payment_mode_id: 3,
        cart_items: [
          {
            merchant_id: activeMerchantId,
            product_id: product.id || product._id,
            item_image_url: null,
            product_name: product.name,
            product_price: parseFloat(product.price || product.product_pricing?.price_sell || 0),
            quantity: 1,
            product_options: []
          }
        ]
      };
      const cartRes = await fetch(`${HYPERZOD_BASE_URL}/store/v1/cart`, {
        method: 'POST',
        headers,
        body: JSON.stringify(cartPayload)
      });
      const cartData = await cartRes.json();
      if (!cartData.success) throw new Error('Failed to update cart: ' + JSON.stringify(cartData));
      const cartId = cartData.data.cart_id || cartData.data._id || cartData.data.id;

      // 5. Validate cart
      const validateParams = new URLSearchParams({
        user_id: String(userId),
        cart_id: String(cartId),
        order_type: 'pickup',
        address_id: String(addressId),
        delivery_location: '52.2215372,6.8936619',
        payment_mode_id: '3'
      });

      const valRes = await fetch(`${HYPERZOD_BASE_URL}/store/v1/cart/validate?${validateParams.toString()}`, {
        method: 'GET',
        headers
      });
      const valData = await valRes.json();
      if (!valData.success) throw new Error('Failed to validate cart: ' + JSON.stringify(valData));
      const checksum = valData.data.checksum;

      // 6. Create order
      const orderPayload = {
        user_id: userId,
        merchant_id: activeMerchantId,
        address_id: addressId,
        delivery_address_id: addressId,
        cart_id: cartId,
        payment_mode_id: 3,
        order_type: 'pickup',
        order_comment: 'Automated test order from Spoonful POS App',
        checksum: checksum,
        scheduling_slot: {
          is_scheduled: false
        }
      };
      const orderRes = await fetch(`${HYPERZOD_BASE_URL}/admin/v1/order/create`, {
        method: 'POST',
        headers,
        body: JSON.stringify(orderPayload)
      });
      const orderData = await orderRes.json();
      if (!orderData.success) throw new Error('Failed to create order: ' + JSON.stringify(orderData));
      
      console.log("Hyperzod test order created successfully!", orderData.data);

      // 7. Sync directly to Supabase via Edge Function webhook
      try {
        console.log("Synchronizing test order to Supabase...");
        const syncPayload = {
          ...orderData.data,
          cart_items: [
            {
              product_name: product.name,
              quantity: 1,
              product_price: parseFloat(product.price || product.product_pricing?.price_sell || 0),
              item_note: ''
            }
          ],
          subtotal: parseFloat(product.price || product.product_pricing?.price_sell || 0),
          total_amount: parseFloat(product.price || product.product_pricing?.price_sell || 0)
        };
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        await fetch(`${supabaseUrl}/functions/v1/hyperzod-webhook`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`
          },
          body: JSON.stringify(syncPayload)
        });
      } catch (err) {
        console.error("Direct Supabase webhook sync failed:", err);
      }

      return { success: true, orderId: orderData.data.order_id || orderData.data.id };
    } catch (e) {
      console.error("Failed to trigger Hyperzod test order:", e);
      return { success: false, error: e.message };
    }
  };

  const triggerTestPrint = async (order) => {
    // 1. Android Native Webview Bridge Integration
    if (window.SunmiPrinterBridge) {
      try {
        console.log("Sunmi native bridge detected. Redirecting print job.");
        const orderToSend = {
          ...order,
          items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items
        };
        window.SunmiPrinterBridge.printReceipt(JSON.stringify(orderToSend));
        return;
      } catch (err) {
        console.warn("Sunmi bridge printing failed, falling back to database/browser print:", err);
      }
    }

    // 2. Notify remote Sunmi printer (Android POS app) via Supabase print_requested_at field
    if (order && order.id && order.id !== 'test') {
      try {
        console.log(`Sending remote print command to Sunmi device via Supabase for order ${order.order_number || order.id}`);
        await supabase
          .from('orders')
          .update({ 
            print_requested_at: new Date().toISOString(),
            printed: false 
          })
          .eq('id', order.id);
        console.log("Remote print request successfully sent to Sunmi device via Supabase DB.");
      } catch (err) {
        console.error("Failed to set print_requested_at in Supabase:", err);
      }
    }



    // 3. Real Browser print (Web / PWA / Chrome on Sunmi device)
    const activeMerchant = availableMerchants.find(m => m.id === settingsRef.current.merchantId) || { name: 'Spoonful' };

    
    // Parse order items
    let itemsListText = '';
    try {
      const parsedItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
      if (Array.isArray(parsedItems)) {
        itemsListText = parsedItems.map(item => 
          `   ${item.name.padEnd(24)} x${item.quantity.toString().padStart(2)}  €${(item.price * item.quantity).toFixed(2).padStart(6)}`
        ).join('\n');
      }
    } catch (e) {
      itemsListText = '   (Failed to parse order items)';
    }

    let formattedNotes = order.notes || 'None';
    if (order.notes) {
      try {
        const parsed = JSON.parse(order.notes);
        formattedNotes = parsed.order_comment || parsed.delivery_instructions || parsed.notes || parsed.order_instruction || 'None';
      } catch (e) {
        // Keep raw
      }
    }

    let deliveryQRSection = '';
    if ((order.type || '').toLowerCase() === 'delivery' || (order.type || '').toLowerCase() === 'pickup') {
      const driverUrl = getDriverUrl(order.id);
      deliveryQRSection = `----------------------------------------
Bezorging Claim QR Code:
  [█▀▀▀█ ▄ █▄▀█▀ █▀▀▀█]
  [█ ██ █ █ ▀█▀  █ ██ █]
  [█▄▄▄█ ▀ ▀▀▀▀▀ █▄▄▄█]
  [▄▄ ▄▄▄▄ █  ▀  ▄  ▄ ▄]
  [█▄ ▀█ ▄█▄ ▀▄█▄▀▀▀  ▀]
  [█▀ ▄▀▀ ▀▄█ ▀  █  ▀ █]
  [█▄▄█▄▄▄  ▀▄ █▄▄ █ ▄▀]
Link: ${driverUrl}
`;
    }

    const receiptContent = `
========================================
           ${activeMerchant.name.toUpperCase()} RECEIPT
========================================
Order No:   ${order.order_number || order.id}
Date:       ${new Date(order.created_at || Date.now()).toLocaleString()}
Type:       ${(order.type || 'DINE_IN').toUpperCase()}
Status:     ${(order.status || 'INCOMING').toUpperCase()}
Prep Time:  ${order.preparation_time || 20} minutes
----------------------------------------
ITEMS:
${itemsListText}
----------------------------------------
Subtotal:                    €${Number(order.subtotal || 0).toFixed(2)}
Tax:                         €${Number(order.tax || 0).toFixed(2)}
Delivery Fee:                €${Number(order.delivery_fee || 0).toFixed(2)}
Discount:                    €${Number(order.discount || 0).toFixed(2)}
TOTAL:                       €${Number(order.total || 0).toFixed(2)}
----------------------------------------
Payment Method:              ${(order.payment_method || 'Online').toUpperCase()}
Payment Status:              ${(order.payment_status || 'Pending').toUpperCase()}
Notes:                       ${formattedNotes}
${deliveryQRSection}========================================
         THANK YOU FOR YOUR ORDER
========================================
`;
    
    // Inject print element
    let printDiv = document.getElementById('thermal-print-section');
    if (!printDiv) {
      printDiv = document.createElement('pre');
      printDiv.id = 'thermal-print-section';
      printDiv.className = 'font-mono text-[10px] leading-tight text-black whitespace-pre-wrap p-2';
      document.body.appendChild(printDiv);
    }
    printDiv.innerText = receiptContent;

    console.log(`[Sunmi Web Printer] Printing receipt:\n${receiptContent}`);
    window.print();
  };

  return (
    <POSContext.Provider value={{
      orders,
      supabaseConnected,
      restaurantOpen,
      menuItems,
      settings,
      setSettings,
      availableMerchants,
      activeIncomingOrder,
      setActiveIncomingOrder,
      activeDriverOffer,
      setActiveDriverOffer,
      acceptOrder,
      toggleRestaurantOpen,
      toggleItemStock,
      updateOrderStatus,
      updateOrderPrinted,
      triggerTestPrint,
      playAlertSound,
      createTestOrder,
      authenticatedMerchantId,
      loginMerchant,
      logoutMerchant,
      assignOrderDriver,
      drivers,
      createDriver,
      deleteDriver,
      sirenActive,
      startSirenAlert,
      stopSirenAlert,
      userRole,
      setUserRole,
      superadminName,
      setSuperadminName
    }}>
      {children}
    </POSContext.Provider>
  );
};

export const usePOS = () => useContext(POSContext);
