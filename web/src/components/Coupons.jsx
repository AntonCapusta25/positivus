import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { usePOS } from '../context/POSContext';
import { Search, CheckCircle2, AlertTriangle, Clock, RefreshCw, Ticket, Plus, X } from 'lucide-react';

export default function Coupons() {
  const { playAlertSound } = usePOS();
  const [coupons, setCoupons] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [redeemingId, setRedeemingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, redeemed
  const [latestRedeemedNotification, setLatestRedeemedNotification] = useState(null);

  // Create Coupon States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newCouponCode, setNewCouponCode] = useState('coupon_1');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [newOrderNumber, setNewOrderNumber] = useState('');
  const [newExpiryDays, setNewExpiryDays] = useState(14);
  const [newQuantity, setNewQuantity] = useState(1);
  const [isCreating, setIsCreating] = useState(false);

  // Custom Coupon custom field states (Yoga / Service / Outside Restaurant Contexts)
  const [customTitle, setCustomTitle] = useState('Free Priority Delivery');
  const [customDiscountLabel, setCustomDiscountLabel] = useState('Select');
  const [customImageUrl, setCustomImageUrl] = useState('https://images.unsplash.com/photo-1628102491629-778571d893a3?w=400&q=80');

  // PWA/Redemption Scanner States
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [scanInputVal, setScanInputVal] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [selectedQrCoupon, setSelectedQrCoupon] = useState(null);

  const handleCouponCodeChange = (code) => {
    setNewCouponCode(code);
    const COUPON_METADATA = {
      coupon_1: { title: "Free Priority Delivery", discount_label: "Select", image_url: "https://images.unsplash.com/photo-1628102491629-778571d893a3?w=400&q=80" },
      coupon_2: { title: "10% Off Next Order", discount_label: "Select", image_url: "https://images.unsplash.com/photo-1607083206968-13611e3d76db?w=400&q=80" },
      coupon_3: { title: "Free Mango Lassi", discount_label: "Select", image_url: "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&q=80" },
      coupon_4: { title: "Chef's Secret Sauce", discount_label: "Select", image_url: "https://images.unsplash.com/photo-1589301760014-d929f39ce9b1?w=400&q=80" },
      custom: { title: "", discount_label: "Select", image_url: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&q=80" }
    };
    const meta = COUPON_METADATA[code] || { title: "", discount_label: "Select", image_url: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&q=80" };
    setCustomTitle(meta.title);
    setCustomDiscountLabel(meta.discount_label);
    setCustomImageUrl(meta.image_url);
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        const max_size = 400;
        if (width > height) {
          if (width > max_size) {
            height *= max_size / width;
            width = max_size;
          }
        } else {
          if (height > max_size) {
            width *= max_size / height;
            height = max_size;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        setCustomImageUrl(compressedBase64);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleScanVerify = async (e) => {
    if (e) e.preventDefault();
    const id = scanInputVal.trim();
    if (!id) return;

    try {
      const { data: coupon, error } = await supabase
        .from('issued_coupons')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !coupon) {
        setScanResult({ success: false, errorType: 'not_found', message: 'Invalid or non-existent coupon ID.' });
        return;
      }

      if (coupon.status === 'redeemed') {
        setScanResult({ 
          success: false, 
          errorType: 'already_redeemed', 
          message: `Coupon was already redeemed on ${new Date(coupon.redeemed_at).toLocaleString()}`, 
          coupon 
        });
        return;
      }

      const isExpired = new Date(coupon.expires_at).getTime() < Date.now();
      if (isExpired) {
        setScanResult({ 
          success: false, 
          errorType: 'expired', 
          message: `Coupon expired on ${new Date(coupon.expires_at).toLocaleDateString()}`, 
          coupon 
        });
        return;
      }

      // Mark as redeemed
      const { error: updateErr } = await supabase
        .from('issued_coupons')
        .update({
          status: 'redeemed',
          redeemed_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateErr) throw updateErr;

      setScanResult({
        success: true,
        message: `Successfully redeemed: ${coupon.title}!`,
        coupon: { ...coupon, status: 'redeemed', redeemed_at: new Date().toISOString() }
      });

      setScanInputVal('');
      fetchCoupons();
    } catch (err) {
      setScanResult({ success: false, errorType: 'error', message: 'Redemption failed: ' + err.message });
    }
  };

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    if (!newCustomerEmail.trim()) {
      alert("Customer email is required.");
      return;
    }
    setIsCreating(true);

    if (!customTitle.trim()) {
      alert("Coupon Title is required.");
      setIsCreating(false);
      return;
    }

    const meta = {
      title: customTitle.trim(),
      discount_label: customDiscountLabel.trim() || 'Select',
      image_url: customImageUrl.trim() || 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&q=80'
    };

    let finalCouponCode = newCouponCode;
    if (newCouponCode === 'custom') {
      finalCouponCode = `custom_${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const days = Math.min(Number(newExpiryDays || 14), 14);
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    try {
      const qty = Math.max(1, Number(newQuantity || 1));
      const toInsert = [];
      for (let i = 0; i < qty; i++) {
        toInsert.push({
          order_number: newOrderNumber.trim() || null,
          customer_email: newCustomerEmail.toLowerCase().trim(),
          coupon_code: finalCouponCode,
          title: meta.title,
          discount_label: meta.discount_label,
          image_url: meta.image_url,
          expires_at: expiresAt,
          status: 'active'
        });
      }

      const { error } = await supabase
        .from('issued_coupons')
        .insert(toInsert);

      if (error) throw error;

      setIsCreateModalOpen(false);
      setNewCustomerEmail('');
      setNewOrderNumber('');
      setNewExpiryDays(14);
      setNewQuantity(1);
      setCustomTitle('Free Priority Delivery');
      setCustomDiscountLabel('Select');
      setCustomImageUrl('https://images.unsplash.com/photo-1628102491629-778571d893a3?w=400&q=80');
      setNewCouponCode('coupon_1');
      fetchCoupons();
    } catch (err) {
      alert("Failed to issue coupon: " + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  async function fetchCoupons() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('issued_coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCoupons(data || []);
    } catch (err) {
      console.error('Error fetching issued coupons:', err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchCoupons();

    // Request browser notification permissions on mount
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Subscribe to realtime database changes on issued_coupons table
    const channel = supabase
      .channel('realtime-issued-coupons')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'issued_coupons' }, (payload) => {
        console.log('Realtime coupon update payload:', payload);
        if (payload.eventType === 'INSERT') {
          setCoupons(prev => [payload.new, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          // If status changes to redeemed, play sound and trigger alert notifications
          if (payload.new.status === 'redeemed' && payload.old.status !== 'redeemed') {
            try { playAlertSound(); } catch (e) { console.log(e); }

            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('🎟️ Coupon Redeemed!', {
                body: `${payload.new.title} claimed by ${payload.new.customer_email}`,
                icon: '/logo-192.png'
              });
            }

            setLatestRedeemedNotification({
              title: payload.new.title,
              email: payload.new.customer_email,
              time: new Date(payload.new.redeemed_at).toLocaleTimeString(),
              id: payload.new.id
            });
          }
          setCoupons(prev => prev.map(c => c.id === payload.new.id ? payload.new : c));
        } else if (payload.eventType === 'DELETE') {
          setCoupons(prev => prev.filter(c => c.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleStatusChange = async (couponId, newStatus) => {
    try {
      const updateData = { status: newStatus };
      if (newStatus === 'redeemed') {
        updateData.redeemed_at = new Date().toISOString();
      } else {
        updateData.redeemed_at = null;
      }

      const { error } = await supabase
        .from('issued_coupons')
        .update(updateData)
        .eq('id', couponId);

      if (error) throw error;
    } catch (err) {
      alert("Failed to update status: " + err.message);
    }
  };

  const handleRedeem = async (couponId) => {
    setRedeemingId(couponId);
    try {
      const { error } = await supabase
        .from('issued_coupons')
        .update({
          status: 'redeemed',
          redeemed_at: new Date().toISOString()
        })
        .eq('id', couponId);

      if (error) throw error;
      // Realtime subscription will sync the updated coupon object automatically
    } catch (err) {
      alert('Failed to redeem coupon: ' + err.message);
    } finally {
      setRedeemingId(null);
    }
  };

  // Filter coupons based on search query and status filter selection
  const filteredCoupons = coupons.filter(c => {
    const emailMatch = c.customer_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       (c.order_number || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    if (statusFilter === 'all') return emailMatch;
    return emailMatch && c.status === statusFilter;
  });

  // Calculate statistics
  const totalIssued = coupons.length;
  const activeCount = coupons.filter(c => c.status === 'active' && new Date(c.expires_at) >= new Date()).length;
  const redeemedCount = coupons.filter(c => c.status === 'redeemed').length;

  const isLimitReached = activeCount >= 1000;

  // Helper to determine expired status or time left
  const getExpirationText = (expiresAtStr, status) => {
    if (status === 'redeemed') return 'Redeemed';
    const expiresAt = new Date(expiresAtStr);
    const now = new Date();
    const diffTime = expiresAt.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return 'Expired';
    }
    return `Expires in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
  };

  const getExpirationClass = (expiresAtStr, status) => {
    if (status === 'redeemed') return 'text-slate-400 bg-slate-100 dark:bg-slate-800 dark:text-slate-500';
    const expiresAt = new Date(expiresAtStr);
    const now = new Date();
    if (expiresAt < now) return 'text-red-600 bg-red-50 dark:bg-red-950/20 dark:text-red-400';
    
    const diffTime = expiresAt.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 3) return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20 dark:text-yellow-400 font-bold animate-pulse';
    return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400';
  };

  return (
    <div className="p-6 space-y-6">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Ticket className="text-brand-orange" size={24} />
            <span>VIP Coupons & Rewards</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Manage, verify, and redeem customer loyalty coupons directly at the facility.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsScanModalOpen(true)}
            className="flex items-center gap-1.5 py-2 px-3.5 bg-emerald-600 text-white hover:bg-emerald-500 rounded-xl text-xs font-bold shadow-md shadow-emerald-500/15 transition-all cursor-pointer active:scale-95"
          >
            <span>📷 Scan / Redeem</span>
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 py-2 px-3.5 bg-brand-orange text-white hover:bg-opacity-95 rounded-xl text-xs font-bold shadow-md shadow-brand-orange/15 transition-all cursor-pointer active:scale-95 animate-fade-in"
          >
            <Plus size={14} />
            <span>Issue VIP Coupon</span>
          </button>
          <button
            onClick={fetchCoupons}
            className="flex items-center gap-1.5 py-2 px-3.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95"
          >
            <RefreshCw size={14} />
            <span>Refresh List</span>
          </button>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Total Issued</span>
            <span className="text-2xl font-black text-slate-900">{totalIssued}</span>
          </div>
          <span className="text-2xl bg-indigo-50 dark:bg-indigo-950/20 p-3 rounded-xl">🏷️</span>
        </div>
        <div className={`bg-white border p-5 rounded-2xl shadow-sm flex items-center justify-between transition-all ${isLimitReached ? 'border-yellow-400 bg-yellow-50/20' : 'border-slate-100'}`}>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Active Coupons</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{activeCount}</span>
              <span className="text-xs font-bold text-slate-400">/ 1000 Max</span>
            </div>
            {isLimitReached && (
              <span className="text-[9px] font-bold text-yellow-600 block mt-1">⚠️ Active limit reached!</span>
            )}
          </div>
          <span className="text-2xl bg-emerald-50 dark:bg-emerald-950/20 p-3 rounded-xl">⚡</span>
        </div>
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Redeemed Today</span>
            <span className="text-2xl font-black text-slate-900">{redeemedCount}</span>
          </div>
          <span className="text-2xl bg-amber-50 dark:bg-amber-950/20 p-3 rounded-xl">✅</span>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search by customer email or order #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-orange focus:bg-white transition-all font-semibold"
          />
        </div>

        {/* Tab Filters */}
        <div className="flex bg-slate-50 border border-slate-200 p-1 rounded-xl shrink-0">
          {[
            { id: 'all', label: 'All' },
            { id: 'active', label: 'Active' },
            { id: 'redeemed', label: 'Redeemed' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`py-1.5 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Coupons Table List */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 font-bold text-sm animate-pulse">
            Loading coupons database...
          </div>
        ) : filteredCoupons.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-bold text-sm space-y-2">
            <Ticket className="mx-auto text-slate-300" size={32} />
            <p>No coupons found matching these criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  <th className="py-3 px-5">Offer Info</th>
                  <th className="py-3 px-5">Customer Email</th>
                  <th className="py-3 px-5">Origin Order</th>
                  <th className="py-3 px-5">Expires / Expiry</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {filteredCoupons.map((coupon) => {
                  const isExpired = new Date(coupon.expires_at) < new Date() && coupon.status === 'active';
                  
                  return (
                    <tr key={coupon.id} className="hover:bg-slate-50/50 transition-all">
                      <td className="py-4 px-5">
                        <div className="flex items-center space-x-3">
                          {coupon.image_url ? (
                            <img className="w-10 h-10 rounded-xl object-cover border border-slate-100" src={coupon.image_url} alt="" />
                          ) : (
                            <span className="w-10 h-10 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center text-base">🏷️</span>
                          )}
                          <div>
                            <span className="font-extrabold text-slate-900 block">{coupon.title}</span>
                            <span className="text-[10px] text-slate-400 block font-mono">Code: {coupon.coupon_code}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-5 font-bold text-slate-900">{coupon.customer_email}</td>
                      <td className="py-4 px-5 font-mono text-slate-500">#{coupon.order_number}</td>
                      <td className="py-4 px-5">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 ${getExpirationClass(coupon.expires_at, coupon.status)}`}>
                          <Clock size={10} />
                          <span>{getExpirationText(coupon.expires_at, coupon.status)}</span>
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        <select
                          value={coupon.status}
                          onChange={(e) => handleStatusChange(coupon.id, e.target.value)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border cursor-pointer focus:outline-none focus:ring-1 focus:ring-brand-orange transition-all ${
                            coupon.status === 'redeemed'
                              ? 'bg-amber-50 text-amber-600 border-amber-200'
                              : isExpired
                              ? 'bg-red-50 text-red-500 border-red-200'
                              : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                          }`}
                        >
                          <option value="active">Active</option>
                          <option value="redeemed">Redeemed</option>
                        </select>
                      </td>
                      <td className="py-4 px-5 text-right flex items-center justify-end space-x-2">
                        <button
                          onClick={() => setSelectedQrCoupon(coupon)}
                          className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition-all cursor-pointer shadow-sm"
                          title="View QR Code"
                        >
                          🔍 QR
                        </button>
                        {coupon.status === 'active' && !isExpired && (
                          <button
                            disabled={redeemingId === coupon.id}
                            onClick={() => handleRedeem(coupon.id)}
                            className="py-1.5 px-3 bg-brand-orange hover:bg-opacity-95 text-white font-bold rounded-lg text-[10px] shadow-sm cursor-pointer active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none uppercase tracking-wider"
                          >
                            {redeemingId === coupon.id ? 'Redeeming...' : 'Redeem'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Issue VIP Coupon Modal Overlay */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[160] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-100 max-w-md w-full shadow-2xl p-6 flex flex-col space-y-5 animate-scale-in">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Ticket className="text-brand-orange" size={20} />
                <span>Issue VIP Coupon</span>
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 hover:bg-slate-50 text-slate-400 hover:text-slate-700 rounded-lg transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCoupon} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Customer Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. guest@spoonfull.com"
                  value={newCustomerEmail}
                  onChange={(e) => setNewCustomerEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-brand-orange focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Select Coupon Reward Template</label>
                <select
                  value={newCouponCode}
                  onChange={(e) => handleCouponCodeChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-brand-orange focus:bg-white transition-all cursor-pointer"
                >
                  <option value="coupon_1">Free Priority Delivery</option>
                  <option value="coupon_2">10% Off Next Order</option>
                  <option value="coupon_3">Free Mango Lassi</option>
                  <option value="coupon_4">Chef's Secret Sauce</option>
                  <option value="custom">Custom Coupon (Yoga / Service / Outside Restaurant)</option>
                </select>
              </div>

              <div className="space-y-3.5 border-l-2 border-brand-orange pl-3.5 animate-fade-in">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Coupon Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Yoga Class - 25% Discount"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-brand-orange focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Discount / Service Label</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 25% Off"
                    value={customDiscountLabel}
                    onChange={(e) => setCustomDiscountLabel(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-brand-orange focus:bg-white transition-all"
                  />
                </div>
                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Coupon Image Upload</label>
                  <div className="flex items-center space-x-3 mt-1">
                    {customImageUrl && (
                      <img src={customImageUrl} className="w-11 h-11 rounded-xl object-cover border border-slate-200 shadow-sm" alt="Preview" />
                    )}
                    <div className="flex-1">
                      <label className="cursor-pointer bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold py-2.5 px-3 rounded-xl border border-slate-200 flex items-center justify-center space-x-1.5 transition-all active:scale-98">
                        <Plus size={14} />
                        <span>Select/Take Image</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleImageFileChange} 
                          className="hidden" 
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Expiry Period (Max 14 Days)</label>
                  <input
                    type="number"
                    min="1"
                    max="14"
                    required
                    value={newExpiryDays}
                    onChange={(e) => setNewExpiryDays(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-brand-orange focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Quantity to Issue</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-brand-orange focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Order # (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. TEST-1093"
                  value={newOrderNumber}
                  onChange={(e) => setNewOrderNumber(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-brand-orange focus:bg-white transition-all"
                />
              </div>

              <div className="flex space-x-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 py-2.5 bg-brand-orange hover:bg-opacity-95 text-white text-xs font-bold rounded-xl shadow-md shadow-brand-orange/15 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isCreating ? 'Issuing...' : 'Issue Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Display Card Modal */}
      {selectedQrCoupon && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[160] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-100 max-w-sm w-full shadow-2xl p-6 flex flex-col items-center text-center space-y-4 animate-scale-in">
            <div className="w-full flex justify-between items-center border-b border-slate-100 pb-3">
              <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Coupon Details</span>
              <button onClick={() => setSelectedQrCoupon(null)} className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all">
                <X size={16} />
              </button>
            </div>

            {selectedQrCoupon.image_url ? (
              <img src={selectedQrCoupon.image_url} className="w-20 h-20 rounded-2xl object-cover border border-slate-100 shadow-sm" alt="" />
            ) : (
              <span className="text-4xl bg-indigo-50 p-4 rounded-2xl">🏷️</span>
            )}

            <div className="space-y-1">
              <h4 className="text-base font-black text-slate-900">{selectedQrCoupon.title}</h4>
              <span className="text-[10px] bg-brand-orange/10 text-brand-orange px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">{selectedQrCoupon.discount_label}</span>
            </div>

            {/* QR Code generator */}
            <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-2xl shadow-inner">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${selectedQrCoupon.id}`} 
                className="w-40 h-40 object-contain rounded-lg"
                alt="QR Code" 
              />
            </div>

            <div className="text-[10px] text-slate-400 font-bold font-mono select-all select-text">
              ID: {selectedQrCoupon.id}
            </div>

            <div className="w-full bg-slate-50 p-3 rounded-xl border border-slate-100 text-left text-[11px] font-bold text-slate-500 space-y-1">
              <div>Customer: <span className="text-slate-800 select-all select-text">{selectedQrCoupon.customer_email}</span></div>
              <div>Expiry: <span className="text-slate-800">{new Date(selectedQrCoupon.expires_at).toLocaleDateString()}</span></div>
              <div>Status: <span className={selectedQrCoupon.status === 'redeemed' ? 'text-amber-500' : 'text-emerald-500'}>{selectedQrCoupon.status.toUpperCase()}</span></div>
            </div>

            <button 
              onClick={() => window.print()} 
              className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all shadow-md"
            >
              🖨️ Print Coupon Card
            </button>
          </div>
        </div>
      )}

      {/* Scan & Redeem Modal */}
      {isScanModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[160] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-100 max-w-md w-full shadow-2xl p-6 flex flex-col space-y-4 animate-scale-in">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <span>📷 Scan & Redeem Coupon</span>
              </h3>
              <button 
                onClick={() => {
                  setIsScanModalOpen(false);
                  setScanResult(null);
                  setScanInputVal('');
                }} 
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleScanVerify} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Scan or Type Coupon UUID</label>
                <input 
                  type="text"
                  required
                  autoFocus
                  placeholder="Scan QR code or paste unique UUID..."
                  value={scanInputVal}
                  onChange={(e) => setScanInputVal(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white transition-all font-mono"
                />
              </div>

              <button 
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
              >
                Verify & Redeem
              </button>
            </form>

            {/* Scan Results Layout */}
            {scanResult && (
              <div className={`p-4 rounded-2xl border text-xs font-bold flex flex-col items-center text-center space-y-2.5 ${
                scanResult.success 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}>
                <span className="text-3xl">{scanResult.success ? '🎉' : '❌'}</span>
                <div>
                  <h4 className="text-sm font-black uppercase tracking-tight">{scanResult.success ? 'Redeemed Successfully' : 'Redemption Failed'}</h4>
                  <p className="mt-1 font-medium">{scanResult.message}</p>
                </div>
                {scanResult.coupon && (
                  <div className="w-full bg-white/70 border border-slate-100 p-3 rounded-xl text-left text-[11px] text-slate-600 space-y-1">
                    <div>Coupon: <span className="text-slate-900 font-extrabold">{scanResult.coupon.title}</span></div>
                    <div>Customer: <span className="text-slate-900">{scanResult.coupon.customer_email}</span></div>
                    <div>Expiry: <span className="text-slate-900">{new Date(scanResult.coupon.expires_at).toLocaleDateString()}</span></div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Realtime Redemption Notification Banner */}
      {latestRedeemedNotification && (
        <div className="fixed top-6 right-6 z-[200] max-w-sm w-full bg-slate-900 border border-emerald-500/30 text-white p-4 rounded-2xl shadow-2xl flex items-start space-x-3 animate-slide-up">
          <span className="text-2xl">🎉</span>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-black uppercase tracking-widest text-emerald-400">Coupon Redeemed</h4>
            <p className="text-xs font-extrabold text-white mt-1 truncate">{latestRedeemedNotification.title}</p>
            <p className="text-[10px] text-slate-400 font-semibold truncate mt-0.5">By: {latestRedeemedNotification.email}</p>
            <p className="text-[9px] text-slate-500 font-bold mt-1">At: {latestRedeemedNotification.time}</p>
          </div>
          <button 
            onClick={() => setLatestRedeemedNotification(null)} 
            className="p-1 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

    </div>
  );
}