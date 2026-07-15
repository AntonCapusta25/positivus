import React, { useState, useEffect, useRef } from 'react';
import { usePOS } from '../context/POSContext';
import { supabase } from '../supabaseClient';
import { Camera, MapPin, Clock, CheckCircle2, Navigation, Shield, ArrowRight, UserCheck, Search, QrCode } from 'lucide-react';
import { useJsApiLoader, GoogleMap, Marker, DirectionsService, DirectionsRenderer } from '@react-google-maps/api';

export default function DriverPortal() {
  const { orders, updateOrderStatus, availableMerchants, settings, setSettings, assignOrderDriver } = usePOS();
  const [driverName, setDriverName] = useState(() => localStorage.getItem('pos_driver_name') || '');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [activeOrder, setActiveOrder] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState('my_tasks'); // my_tasks, offers
  const [loginError, setLoginError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  
  // Camera scanning state
  const [showScanner, setShowScanner] = useState(false);
  const [scanningBeam, setScanningBeam] = useState(false);
  const [scannerError, setScannerError] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Map & routing states
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
  });
  
  const [directionsResponse, setDirectionsResponse] = useState(null);
  const [driverCoords, setDriverCoords] = useState([52.370216, 4.895168]); // Default Amsterdam
  const [customerCoords, setCustomerCoords] = useState([52.373216, 4.899168]);

  // Track Driver GPS coordinates using watchPosition
  useEffect(() => {
    if (!navigator.geolocation) {
      console.warn("Geolocation watchPosition not supported.");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        setDriverCoords([lat, lon]);
      },
      (err) => {
        console.warn("Geolocation watch error:", err);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // Geocode active order customer address or create a nearby route offset
  useEffect(() => {
    if (!activeOrder) return;
    
    const geocodeAddress = async () => {
      const address = activeOrder.customer_address;
      if (!address) {
        setCustomerCoords([driverCoords[0] + 0.005, driverCoords[1] + 0.005]);
        return;
      }
      
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
        const res = await fetch(url, { headers: { 'User-Agent': 'SpoonfulPOS/1.0' } });
        const json = await res.json();
        if (json && json.length > 0) {
          const lat = parseFloat(json[0].lat);
          const lon = parseFloat(json[0].lon);
          setCustomerCoords([lat, lon]);
        } else {
          // Fallback offset
          setCustomerCoords([driverCoords[0] + 0.005, driverCoords[1] + 0.005]);
        }
      } catch (err) {
        console.warn("Geocoding failed, falling back to mock offset:", err);
        setCustomerCoords([driverCoords[0] + 0.005, driverCoords[1] + 0.005]);
      }
    };

    geocodeAddress();
  }, [activeOrder, driverCoords]);

  // Fetch Directions when coordinates change
  useEffect(() => {
    if (!isLoaded || !apiKey || !activeOrder) return;
    
    const directionsService = new window.google.maps.DirectionsService();
    directionsService.route(
      {
        origin: new window.google.maps.LatLng(driverCoords[0], driverCoords[1]),
        destination: new window.google.maps.LatLng(customerCoords[0], customerCoords[1]),
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK) {
          setDirectionsResponse(result);
        } else {
          console.error(`Directions request failed due to ${status}`);
        }
      }
    );
  }, [driverCoords, customerCoords, isLoaded, activeOrder, apiKey]);

  // Auto-sync merchant_id for active driver on mount
  useEffect(() => {
    if (!driverName) return;
    const syncMerchantId = async () => {
      try {
        const { data, error } = await supabase
          .from('drivers')
          .select('merchant_id')
          .eq('name', driverName);
        
        if (data && data.length > 0) {
          setSettings(prev => ({ ...prev, merchantId: data[0].merchant_id }));
        }
      } catch (err) {
        console.warn("Failed to sync driver merchant_id on load:", err);
      }
    };
    syncMerchantId();
  }, [driverName]);

  const claimOrder = async (orderId) => {
    try {
      const ord = orders.find(o => o.id === orderId) || {};
      const duration = ord.delivery_duration || 15;

      const res = await assignOrderDriver(orderId, driverName, duration);
      
      if (!res.success) {
        console.warn("Claim database sync warning:", res.error);
        if (res.error?.includes("driver_name") || res.error?.includes("schema cache") || res.error?.includes("column")) {
          alert("Spoonful warning: The 'driver_name' column is not found in your Supabase 'orders' table. We are claiming the order LOCALLY for testing.\n\nTo persist this, make sure to execute the SQL migration script in your Supabase SQL console!");
        } else {
          throw new Error(res.error);
        }
      } else {
        alert("Delivery order claimed successfully!");
      }
      
      setActiveOrder(prev => {
        const base = prev || ord;
        return { ...base, driver_name: driverName, delivery_duration: duration };
      });
      setActiveSubTab('my_tasks');
    } catch (err) {
      console.error("Failed to claim order:", err);
      alert("Claim failed: " + err.message);
    }
  };

  // Check URL parameters for direct QR scan link: e.g. /driver?order_id=UUID
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderIdParam = params.get('order_id');
    if (orderIdParam) {
      loadOrder(orderIdParam);
    }
  }, [orders]);

  const loadOrder = async (orderId) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();
      
      if (error) throw error;
      setActiveOrder(data);
      setSelectedOrderId(data.order_number || data.id);
    } catch (e) {
      // Fallback: look up in orders array
      const matched = orders.find(o => o.id === orderId || o.order_number === orderId);
      if (matched) {
        setActiveOrder(matched);
        setSelectedOrderId(matched.order_number || matched.id);
      } else {
        alert("Order not found or invalid QR code.");
      }
    }
  };

  const handleDriverLogin = async (e) => {
    e.preventDefault();
    const name = e.target.driverNameInput.value.trim();
    const passcode = e.target.driverPinInput.value.trim();

    if (!name || !passcode) {
      setLoginError("Name and passcode are required.");
      return;
    }

    setIsVerifying(true);
    setLoginError("");

    try {
      // Query the Supabase drivers table
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('name', name)
        .eq('passcode', passcode);

      if (error && (error.code === 'PGRST116' || error.message.includes('relation "drivers" does not exist'))) {
        // Fallback to local storage drivers list
        const localD = localStorage.getItem('pos_drivers');
        const list = localD ? JSON.parse(localD) : [
          { id: 'drv-1', name: 'John Doe', passcode: '1234' },
          { id: 'drv-2', name: 'Jane Smith', passcode: '1234' },
          { id: 'drv-3', name: 'Carlos V.', passcode: '1234' }
        ];

        const matched = list.find(d => d.name.toLowerCase() === name.toLowerCase() && d.passcode === passcode);
        if (matched) {
          setDriverName(matched.name);
          localStorage.setItem('pos_driver_name', matched.name);
          setSettings(prev => ({ ...prev, merchantId: matched.merchant_id || '6a0f03b4500ed5db150be1a1' }));
        } else {
          setLoginError("Invalid credentials (local fallback mismatch).");
        }
      } else if (data && data.length > 0) {
        setDriverName(data[0].name);
        localStorage.setItem('pos_driver_name', data[0].name);
        setSettings(prev => ({ ...prev, merchantId: data[0].merchant_id }));
      } else {
        // Fallback to local storage drivers list as a secondary check if Supabase table is empty
        const localD = localStorage.getItem('pos_drivers');
        const list = localD ? JSON.parse(localD) : [
          { id: 'drv-1', name: 'John Doe', passcode: '1234', merchant_id: '6a0f03b4500ed5db150be1a1' },
          { id: 'drv-2', name: 'Jane Smith', passcode: '1234', merchant_id: '6a0f03b4500ed5db150be1a1' },
          { id: 'drv-3', name: 'Carlos V.', passcode: '1234', merchant_id: '6a0f03b4500ed5db150be1a1' }
        ];

        const matched = list.find(d => d.name.toLowerCase() === name.toLowerCase() && d.passcode === passcode);
        if (matched) {
          setDriverName(matched.name);
          localStorage.setItem('pos_driver_name', matched.name);
          setSettings(prev => ({ ...prev, merchantId: matched.merchant_id || '6a0f03b4500ed5db150be1a1' }));
        } else {
          setLoginError("Incorrect driver name or PIN passcode.");
        }
      }
    } catch (err) {
      console.error("Auth error:", err);
      setLoginError("Error connecting to database: " + err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleManualSearch = (e) => {
    e.preventDefault();
    const q = selectedOrderId.trim();
    if (!q) return;
    const matched = orders.find(o => 
      o.order_number?.toLowerCase() === q.toLowerCase() || 
      o.id.toLowerCase() === q.toLowerCase()
    );
    if (matched) {
      setActiveOrder(matched);
    } else {
      alert("Order number not found in local active orders queue.");
    }
  };

  // Start HTML5 Camera stream
  const startCamera = async () => {
    setShowScanner(true);
    setScanningBeam(true);
    setScannerError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn("Camera permission denied or unavailable:", err);
      setScannerError("Camera access denied or unsupported. Please enter order number manually.");
      setScanningBeam(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowScanner(false);
    setScanningBeam(false);
  };

  // Simulate scanning of the QR receipt code
  const simulateScan = () => {
    // Pick the most recent delivery order that is not completed
    const pendingDelivery = orders.find(o => 
      (o.type || '').toLowerCase() === 'delivery' && 
      (o.status || '').toLowerCase() !== 'completed'
    );

    if (pendingDelivery) {
      setTimeout(() => {
        stopCamera();
        setActiveOrder(pendingDelivery);
        setSelectedOrderId(pendingDelivery.order_number || pendingDelivery.id);
      }, 1500);
    } else {
      alert("No active delivery orders available to scan right now.");
      stopCamera();
    }
  };

  // Update order status from driver phone
  const handleUpdateStatus = async (status) => {
    if (!activeOrder) return;
    await updateOrderStatus(activeOrder.id, status);
    
    // Refresh local copy
    setActiveOrder(prev => ({ ...prev, status }));
  };

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Filter orders assigned to this driver
  const assignedOrders = orders.filter(o => 
    o.driver_name?.toLowerCase() === driverName.toLowerCase() &&
    o.status !== 'completed'
  );

  // Available unassigned delivery orders
  const availableOffers = orders.filter(o => 
    (o.type || '').toLowerCase() === 'delivery' &&
    (!o.driver_name || o.driver_name === '') &&
    (o.status === 'ready' || o.status === 'preparing' || o.status === 'incoming')
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col items-center justify-between pb-8">
      {/* Mobile-optimized Container */}
      <div className="w-full max-w-md px-4 flex flex-col justify-start flex-1 py-6 space-y-6">
        
        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-2">
            <span className="text-xl">🛵</span>
            <div>
              <h1 className="text-base font-extrabold tracking-tight text-white leading-tight">SPOONFUL RUNNER</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Driver Dispatch Portal</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 px-3 py-1 rounded-full text-xs font-semibold text-emerald-400">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Driver Online</span>
          </div>
        </header>

        {/* 1. Login State */}
        {!driverName ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5 my-auto">
            <div className="text-center space-y-2">
              <div className="p-3 bg-brand-orange/10 text-brand-orange rounded-full w-12 h-12 mx-auto flex items-center justify-center">
                <Shield size={24} />
              </div>
              <h2 className="text-lg font-bold text-white">Driver Verification</h2>
              <p className="text-xs text-slate-400">Enter your name to sign into the restaurant delivery terminal</p>
            </div>

            <form onSubmit={handleDriverLogin} className="space-y-4">
              {loginError && (
                <div className="p-3 bg-rose-950/40 border border-rose-900/60 rounded-xl text-xs text-rose-400 font-semibold leading-relaxed animate-shake">
                  ⚠️ {loginError}
                </div>
              )}
              
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Driver Name</label>
                <input
                  type="text"
                  name="driverNameInput"
                  required
                  placeholder="e.g. John Doe"
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange placeholder-slate-500 transition-all font-semibold"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">PIN Passcode</label>
                <input
                  type="password"
                  name="driverPinInput"
                  required
                  maxLength="4"
                  placeholder="4-digit PIN"
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange placeholder-slate-500 transition-all font-semibold tracking-widest text-center text-lg font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={isVerifying}
                className="w-full bg-brand-orange hover:bg-opacity-95 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-3 px-4 rounded-xl text-sm flex items-center justify-center space-x-2 transition-all shadow-lg shadow-brand-orange/10"
              >
                <span>{isVerifying ? 'Verifying Credentials...' : 'Verify Identity'}</span>
                <ArrowRight size={16} />
              </button>
            </form>
          </div>
        ) : (
          /* Active Driver Dashboard */
          <>
            {/* Driver Identity Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700 text-lg">
                  👤
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-semibold">Active Courier</span>
                  <span className="text-sm font-bold text-white">{driverName}</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setDriverName('');
                  localStorage.removeItem('pos_driver_name');
                  setActiveOrder(null);
                }}
                className="text-xs text-slate-500 hover:text-rose-400 font-bold transition-all"
              >
                Log Out
              </button>
            </div>

            {/* Live Camera Scanner Option */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Scan Receipt</h3>
              
              {!showScanner ? (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={startCamera}
                    className="bg-brand-orange text-white py-4 px-4 rounded-2xl flex flex-col items-center justify-center space-y-1 hover:bg-opacity-90 transition-all shadow-md shadow-brand-orange/5"
                  >
                    <Camera size={24} />
                    <span className="text-xs font-bold">Open Camera</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      // Trigger mock scan
                      startCamera();
                      simulateScan();
                    }}
                    className="bg-slate-900 border border-slate-800 text-slate-200 py-4 px-4 rounded-2xl flex flex-col items-center justify-center space-y-1 hover:bg-slate-850 transition-all"
                  >
                    <QrCode size={24} className="text-brand-orange" />
                    <span className="text-xs font-bold">Demo Auto-Scan</span>
                  </button>
                </div>
              ) : (
                <div className="relative rounded-2xl border border-slate-800 overflow-hidden bg-black flex flex-col items-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-56 object-cover"
                  />
                  {scanningBeam && (
                    <div className="absolute inset-x-0 top-0 h-0.5 bg-emerald-400 opacity-80 animate-bounce shadow-[0_0_8px_rgba(52,211,153,0.8)]" style={{ animationDuration: '2s' }} />
                  )}
                  {scannerError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 p-4 text-center">
                      <p className="text-xs text-rose-400 font-bold">{scannerError}</p>
                    </div>
                  )}
                  <div className="absolute bottom-3 flex space-x-2">
                    <button
                      onClick={simulateScan}
                      className="bg-emerald-600 text-white font-bold text-xs py-1.5 px-3 rounded-lg shadow-md hover:bg-emerald-500 transition-all"
                    >
                      Mock QR Detection
                    </button>
                    <button
                      onClick={stopCamera}
                      className="bg-slate-800 text-white font-bold text-xs py-1.5 px-3 rounded-lg hover:bg-slate-700 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Manual search input */}
              <form onSubmit={handleManualSearch} className="flex space-x-2">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={selectedOrderId}
                    onChange={(e) => setSelectedOrderId(e.target.value)}
                    placeholder="Enter order no. manually"
                    className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-orange placeholder-slate-600 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white px-4 rounded-xl text-xs font-bold transition-all"
                >
                  Find
                </button>
              </form>
            </div>

            {/* Active scanned order details */}
            {activeOrder ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl animate-fade-in">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Order Scanned</span>
                    <h4 className="text-sm font-extrabold text-white">#{activeOrder.order_number || activeOrder.id.slice(0,8)}</h4>
                  </div>
                  <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    activeOrder.status === 'completed' 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                      : 'bg-brand-orange/10 text-brand-orange border border-brand-orange/20'
                  }`}>
                    {activeOrder.status}
                  </div>
                </div>

                {/* Delivery details card */}
                <div className="space-y-3">
                  <div className="flex items-start space-x-2.5">
                    <MapPin className="text-slate-500 shrink-0 mt-0.5" size={16} />
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Destination Address</span>
                      <p className="text-xs text-slate-300 font-semibold">{activeOrder.customer_address || 'No address specified'}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2.5">
                    <Clock className="text-slate-500 shrink-0 mt-0.5" size={16} />
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Delivery Duration</span>
                      <p className="text-xs text-slate-300 font-semibold">
                        {activeOrder.delivery_duration || 15} minutes (Target)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2.5">
                    <UserCheck className="text-slate-500 shrink-0 mt-0.5" size={16} />
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">In Charge</span>
                      <p className="text-xs text-slate-300 font-semibold">{activeOrder.driver_name || 'Unassigned'}</p>
                    </div>
                  </div>
                </div>

                {/* Geolocation & Leaflet Routing Map */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Live Delivery Route Map</span>
                  
                  <div 
                    className="h-48 w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 relative z-0"
                    style={{ minHeight: '192px' }}
                  >
                    {!isLoaded || !apiKey ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50">
                        <span className="text-xs text-slate-500 font-bold animate-pulse">
                          {!apiKey ? 'Missing Google Maps API Key (.env)' : 'Loading Maps engine...'}
                        </span>
                      </div>
                    ) : (
                      <GoogleMap
                        mapContainerStyle={{ width: '100%', height: '100%' }}
                        center={{ lat: driverCoords[0], lng: driverCoords[1] }}
                        zoom={14}
                        options={{
                          disableDefaultUI: true,
                          zoomControl: true,
                        }}
                      >
                        {directionsResponse && (
                          <DirectionsRenderer 
                            directions={directionsResponse}
                            options={{ suppressMarkers: true, polylineOptions: { strokeColor: '#ff6b00', strokeWeight: 4 } }}
                          />
                        )}
                        <Marker position={{ lat: driverCoords[0], lng: driverCoords[1] }} label="🛵" />
                        <Marker position={{ lat: customerCoords[0], lng: customerCoords[1] }} label="📍" />
                      </GoogleMap>
                    )}
                  </div>
                  
                  {/* Coordinates indicator footer */}
                  <div className="flex items-center justify-between text-[9px] font-bold text-slate-600 uppercase px-1">
                    <span>GPS: {driverCoords[0].toFixed(5)}, {driverCoords[1].toFixed(5)}</span>
                    <span className="text-brand-orange animate-pulse">● Live Courier Tracking Active</span>
                  </div>
                </div>

                {/* Order items checklist */}
                <div className="bg-slate-950/50 p-3.5 rounded-2xl space-y-2 border border-slate-800/40">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Items Checklist</span>
                  <div className="text-xs space-y-1.5 text-slate-300 font-semibold">
                    {(() => {
                      let items = [];
                      try {
                        items = typeof activeOrder.items === 'string' ? JSON.parse(activeOrder.items) : activeOrder.items;
                      } catch (err) {}
                      return Array.isArray(items) ? items.map((item, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span>{item.name} x{item.quantity}</span>
                          <span className="text-slate-500">Verified</span>
                        </div>
                      )) : <div>No item details available.</div>;
                    })()}
                  </div>
                </div>

                {/* Dispatch & Delivery Triggers */}
                <div className="flex space-x-2 pt-2">
                  {(!activeOrder.driver_name || activeOrder.driver_name.toLowerCase() !== driverName.toLowerCase()) ? (
                    <button
                      onClick={() => claimOrder(activeOrder.id)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-4 rounded-xl text-sm flex items-center justify-center space-x-2 transition-all shadow-md"
                    >
                      <UserCheck size={18} />
                      <span>Claim Delivery Offer</span>
                    </button>
                  ) : (
                    <>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeOrder.customer_address || '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-slate-800 hover:bg-slate-750 text-white font-bold p-3.5 rounded-xl text-sm flex items-center justify-center transition-all shrink-0"
                        title="Navigate via GPS"
                      >
                        <Navigation size={18} className="text-brand-orange" />
                      </a>
                      
                      {activeOrder.status === 'ready' && (
                        <button
                          onClick={() => handleUpdateStatus('preparing')} // Mark as Dispatched/Delivering
                          className="flex-1 bg-brand-orange hover:bg-opacity-95 text-white font-bold py-3.5 px-4 rounded-xl text-sm flex items-center justify-center space-x-2 transition-all shadow-md"
                        >
                          <span>Mark Dispatched</span>
                          <ArrowRight size={16} />
                        </button>
                      )}

                      {activeOrder.status !== 'completed' && activeOrder.status !== 'ready' && (
                        <button
                          onClick={() => handleUpdateStatus('completed')} // Deliver complete
                          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-4 rounded-xl text-sm flex items-center justify-center space-x-2 transition-all shadow-md"
                        >
                          <CheckCircle2 size={18} />
                          <span>Mark Delivered</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ) : (
              /* Driver Assignment List & Subtabs */
              <div className="space-y-4">
                {/* Tab Switcher */}
                <div className="grid grid-cols-2 gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setActiveSubTab('my_tasks')}
                    className={`py-2 text-center rounded-lg text-xs font-bold transition-all ${
                      activeSubTab === 'my_tasks'
                        ? 'bg-slate-800 text-white border border-slate-700'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Your Tasks ({assignedOrders.length})
                  </button>
                  <button
                    onClick={() => setActiveSubTab('offers')}
                    className={`py-2 text-center rounded-lg text-xs font-bold transition-all relative ${
                      activeSubTab === 'offers'
                        ? 'bg-slate-800 text-white border border-slate-700'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Available Offers
                    {availableOffers.length > 0 && (
                      <span className="absolute -top-1.5 -right-1 bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                        {availableOffers.length}
                      </span>
                    )}
                  </button>
                </div>

                {activeSubTab === 'my_tasks' ? (
                  /* My Tasks List */
                  <div className="space-y-2">
                    {assignedOrders.length === 0 ? (
                      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-8 text-center text-slate-500 space-y-1">
                        <div className="text-3xl">📭</div>
                        <p className="text-xs font-bold">No active tasks assigned to you</p>
                        <p className="text-[10px] text-slate-600">Scan a receipt or claim an offer from the Available tab.</p>
                      </div>
                    ) : (
                      assignedOrders.map(o => (
                        <button
                          key={o.id}
                          onClick={() => {
                            setActiveOrder(o);
                            setSelectedOrderId(o.order_number || o.id);
                          }}
                          className="w-full text-left bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 flex items-center justify-between transition-all"
                        >
                          <div className="space-y-1">
                            <h4 className="text-xs font-extrabold text-white">#{o.order_number || o.id.slice(0,8)}</h4>
                            <div className="flex items-center space-x-1 text-[11px] text-slate-400 font-semibold">
                              <MapPin size={10} className="text-brand-orange" />
                              <span className="truncate max-w-[200px]">{o.customer_address || 'No Address'}</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 text-xs font-bold text-brand-orange">
                            <span>{o.status.toUpperCase()}</span>
                            <ArrowRight size={14} />
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                ) : (
                  /* Available Offers List */
                  <div className="space-y-2">
                    {availableOffers.length === 0 ? (
                      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-8 text-center text-slate-500 space-y-1">
                        <div className="text-3xl">🤝</div>
                        <p className="text-xs font-bold">No available delivery offers</p>
                        <p className="text-[10px] text-slate-600">New delivery dispatches will appear here in real-time.</p>
                      </div>
                    ) : (
                      availableOffers.map(o => (
                        <button
                          key={o.id}
                          onClick={() => {
                            setActiveOrder(o);
                            setSelectedOrderId(o.order_number || o.id);
                          }}
                          className="w-full text-left bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 flex items-center justify-between transition-all"
                        >
                          <div className="space-y-1">
                            <h4 className="text-xs font-extrabold text-white">#{o.order_number || o.id.slice(0,8)}</h4>
                            <div className="flex items-center space-x-1 text-[11px] text-slate-400 font-semibold">
                              <MapPin size={10} className="text-brand-orange" />
                              <span className="truncate max-w-[200px]">{o.customer_address || 'No Address'}</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 text-xs font-bold text-emerald-400">
                            <span>CLAIM OFFER</span>
                            <ArrowRight size={14} />
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
