import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { usePOS } from '../context/POSContext';
import { Search, CheckCircle2, AlertTriangle, Clock, RefreshCw, Ticket, Plus, X } from 'lucide-react';

export default function Coupons() {
  const { playAlertSound } = usePOS();
  const [coupons, setCoupons] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [latestRedeemedNotification, setLatestRedeemedNotification] = useState(null);

  // Edit / Details Modal States
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editDiscountLabel, setEditDiscountLabel] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [isSavingCampaign, setIsSavingCampaign] = useState(false);

  // Create Coupon States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newCouponCode, setNewCouponCode] = useState('custom_coupon');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [newOrderNumber, setNewOrderNumber] = useState('');
  const [newExpiryDays, setNewExpiryDays] = useState(14);
  const [newQuantity, setNewQuantity] = useState(1);
  const [isCreating, setIsCreating] = useState(false);

  // Scope selection: 'public' (everyone) or 'targeted' (specific email)
  const [issueScope, setIssueScope] = useState('public');

  // Custom Coupon default details
  const [customTitle, setCustomTitle] = useState('New VIP Offer');
  const [customDiscountLabel, setCustomDiscountLabel] = useState('Select');
  const [customImageUrl, setCustomImageUrl] = useState('https://images.unsplash.com/photo-1628102491629-778571d893a3?w=400&q=80');

  // Scanner modal state
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [scanInputVal, setScanInputVal] = useState('');
  const [scanResult, setScanResult] = useState(null);

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
      console.error('Error fetching coupons:', err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchCoupons();

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
          // Play sound and trigger notifications if coupon is redeemed
          if (payload.new.status === 'redeemed' && payload.old.status !== 'redeemed') {
            try { playAlertSound(); } catch (e) { }

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

  // Update selected campaign in realtime if coupons state updates
  useEffect(() => {
    if (selectedCampaign) {
      const updatedInstances = coupons.filter(c => c.coupon_code === selectedCampaign.coupon_code);
      setSelectedCampaign(prev => prev ? { ...prev, instances: updatedInstances } : null);
    }
  }, [coupons]);

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

  const handleImageFileChange = (e, isEdit = false) => {
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
        if (isEdit) {
          setEditImageUrl(compressedBase64);
        } else {
          setCustomImageUrl(compressedBase64);
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    if (issueScope === 'targeted' && !newCustomerEmail.trim()) {
      alert("Customer email is required for targeted scope.");
      return;
    }
    setIsCreating(true);

    const emailToUse = issueScope === 'public' ? 'public' : newCustomerEmail.toLowerCase().trim();
    const days = Math.min(Number(newExpiryDays || 14), 14);
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    try {
      const qty = Math.max(1, Number(newQuantity || 1));
      const toInsert = [];
      for (let i = 0; i < qty; i++) {
        toInsert.push({
          order_number: newOrderNumber.trim() || null,
          customer_email: emailToUse,
          coupon_code: newCouponCode.trim(),
          title: customTitle.trim(),
          discount_label: customDiscountLabel.trim(),
          image_url: customImageUrl,
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
      setCustomTitle('New VIP Offer');
      setCustomDiscountLabel('Select');
      setCustomImageUrl('https://images.unsplash.com/photo-1628102491629-778571d893a3?w=400&q=80');
      setNewCouponCode('custom_coupon');
      setIssueScope('public');
      fetchCoupons();
    } catch (err) {
      alert("Failed to issue coupon: " + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSaveCampaign = async (e) => {
    e.preventDefault();
    if (!editTitle.trim() || !editCode.trim()) {
      alert("Coupon Title and Code are required.");
      return;
    }
    setIsSavingCampaign(true);

    try {
      const { error } = await supabase
        .from('issued_coupons')
        .update({
          title: editTitle.trim(),
          coupon_code: editCode.trim(),
          discount_label: editDiscountLabel.trim(),
          image_url: editImageUrl
        })
        .eq('coupon_code', selectedCampaign.coupon_code);

      if (error) throw error;

      setIsCampaignModalOpen(false);
      setSelectedCampaign(null);
      fetchCoupons();
      alert("Coupon campaign updated successfully!");
    } catch (err) {
      alert("Failed to update campaign: " + err.message);
    } finally {
      setIsSavingCampaign(false);
    }
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

  // Group coupons by coupon_code to show unique campaigns
  const campaigns = [];
  const seenCodes = new Set();

  coupons.forEach(c => {
    if (!seenCodes.has(c.coupon_code)) {
      seenCodes.add(c.coupon_code);

      const instances = coupons.filter(item => item.coupon_code === c.coupon_code);
      const isPublic = instances.some(item => item.customer_email === 'public');
      const claimCount = instances.filter(item => item.customer_email !== 'public').length;
      const redeemedCount = instances.filter(item => item.status === 'redeemed').length;

      campaigns.push({
        ...c,
        isPublic,
        claimCount,
        redeemedCount,
        instances
      });
    }
  });

  // Filter campaigns based on search query
  const filteredCampaigns = campaigns.filter(c => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return c.title.toLowerCase().includes(query) || c.coupon_code.toLowerCase().includes(query);
  });

  // Calculate quick statistics
  const totalCampaigns = campaigns.length;
  const publicCount = campaigns.filter(c => c.isPublic).length;
  const totalClaims = coupons.filter(c => c.customer_email !== 'public').length;
  const totalRedeemed = coupons.filter(c => c.status === 'redeemed').length;

  return (
    <div className="p-6 space-y-6">

      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Ticket className="text-brand-orange" size={24} />
            <span>VIP Campaigns & Rewards</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Define, issue, and manage VIP customer promotion campaigns. Click a campaign to see redemptions.
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
            <span>Create Coupon Offer</span>
          </button>
          <button
            onClick={fetchCoupons}
            className="flex items-center gap-1.5 py-2 px-3.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95"
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Coupon Offers</span>
            <span className="text-2xl font-black text-slate-900">{totalCampaigns}</span>
          </div>
          <span className="text-2xl bg-indigo-50 dark:bg-indigo-950/20 p-3 rounded-xl">🏷️</span>
        </div>
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Storefront Public</span>
            <span className="text-2xl font-black text-slate-900">{publicCount}</span>
          </div>
          <span className="text-2xl bg-sky-50 dark:bg-sky-950/20 p-3 rounded-xl">🌐</span>
        </div>
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Total Customer Claims</span>
            <span className="text-2xl font-black text-slate-900">{totalClaims}</span>
          </div>
          <span className="text-2xl bg-purple-50 dark:bg-purple-950/20 p-3 rounded-xl">👥</span>
        </div>
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Redeemed Coupons</span>
            <span className="text-2xl font-black text-slate-900">{totalRedeemed}</span>
          </div>
          <span className="text-2xl bg-amber-50 dark:bg-amber-950/20 p-3 rounded-xl">✅</span>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search coupon offers by title or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-orange focus:bg-white transition-all font-semibold"
          />
        </div>
      </div>

      {/* Campaigns Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400 font-bold text-sm animate-pulse">
          Loading coupons database...
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="p-12 text-center text-slate-400 font-bold text-sm bg-white border border-slate-100 rounded-2xl shadow-sm space-y-2">
          <Ticket className="mx-auto text-slate-300" size={32} />
          <p>No coupon campaigns found. Click "Create Coupon Offer" to issue one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCampaigns.map((campaign) => {
            return (
              <div
                key={campaign.id}
                onClick={() => {
                  setSelectedCampaign(campaign);
                  setEditTitle(campaign.title);
                  setEditCode(campaign.coupon_code);
                  setEditDiscountLabel(campaign.discount_label);
                  setEditImageUrl(campaign.image_url || '');
                  setIsCampaignModalOpen(true);
                }}
                className="bg-white border border-slate-150 hover:border-brand-orange rounded-3xl p-5 shadow-sm hover:shadow-md cursor-pointer transition-all flex flex-col justify-between space-y-4 group active:scale-98"
              >
                <div className="flex items-start space-x-4">
                  {campaign.image_url ? (
                    <img className="w-14 h-14 rounded-2xl object-cover border border-slate-100 shadow-sm" src={campaign.image_url} alt="" />
                  ) : (
                    <span className="w-14 h-14 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center text-2xl shrink-0">🏷️</span>
                  )}
                  <div className="flex-1 min-w-0">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider inline-block ${campaign.isPublic ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'
                      }`}>
                      {campaign.isPublic ? 'Public Storefront' : 'Targeted Customer'}
                    </span>
                    <h4 className="font-black text-slate-900 text-sm truncate mt-1.5 group-hover:text-brand-orange transition-all">
                      {campaign.title}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-bold font-mono mt-0.5 block">Code: {campaign.coupon_code}</span>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-3 grid grid-cols-2 gap-2 text-center text-xs font-bold text-slate-600">
                  <div className="border-r border-slate-200">
                    <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">Customer Claims</span>
                    <span className="text-slate-800 text-sm font-black mt-0.5 block">{campaign.claimCount}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">Redeemed</span>
                    <span className="text-slate-800 text-sm font-black mt-0.5 block">{campaign.redeemedCount}</span>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 font-extrabold text-right uppercase tracking-wider">
                  Click to View Log & Edit →
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Campaign Details & Activity Stream Modal */}
      {isCampaignModalOpen && selectedCampaign && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[160] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-100 max-w-4xl w-full shadow-2xl p-6 flex flex-col space-y-4 animate-scale-in text-slate-800">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Ticket className="text-brand-orange" size={20} />
                <span>Manage Coupon Offer & Claims</span>
              </h3>
              <button
                onClick={() => {
                  setIsCampaignModalOpen(false);
                  setSelectedCampaign(null);
                }}
                className="p-1 hover:bg-slate-50 text-slate-400 hover:text-slate-700 rounded-lg transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start overflow-y-auto max-h-[70vh] pr-2">

              {/* Left Column: Edit Form */}
              <form onSubmit={handleSaveCampaign} className="space-y-4 bg-slate-50/60 border border-slate-100 p-5 rounded-3xl text-left">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Campaign Settings</h4>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Coupon Title</label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-brand-orange transition-all"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Coupon Code</label>
                  <input
                    type="text"
                    required
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-855 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-brand-orange transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Discount Label</label>
                  <input
                    type="text"
                    required
                    value={editDiscountLabel}
                    onChange={(e) => setEditDiscountLabel(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-855 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-brand-orange transition-all"
                  />
                </div>

                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Coupon Image</label>
                  <div className="flex items-center space-x-3 mt-1">
                    {editImageUrl && (
                      <img src={editImageUrl} className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-sm" alt="Preview" />
                    )}
                    <div className="flex-1">
                      <label className="cursor-pointer bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold py-2.5 px-3 rounded-xl border border-slate-200 flex items-center justify-center space-x-1.5 transition-all active:scale-98">
                        <Plus size={14} />
                        <span>Select/Take Image</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageFileChange(e, true)}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCampaignModalOpen(false);
                      setSelectedCampaign(null);
                    }}
                    className="flex-1 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingCampaign}
                    className="flex-1 py-2.5 bg-brand-orange hover:bg-opacity-95 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    {isSavingCampaign ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>

              </form>

              {/* Right Column: Activity Stream Claim History */}
              <div className="space-y-4 flex flex-col h-full text-left">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Claim & Redemption Log</h4>

                {selectedCampaign.instances.filter(item => item.customer_email !== 'public').length === 0 ? (
                  <div className="flex-1 p-8 text-center text-slate-400 font-bold text-xs bg-slate-50 border border-slate-100 rounded-3xl flex flex-col items-center justify-center space-y-1 py-12">
                    <span className="text-2xl">⏳</span>
                    <p>No customer redemption activity recorded yet.</p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto border border-slate-150 rounded-2xl divide-y divide-slate-100 bg-white max-h-[40vh]">
                    {selectedCampaign.instances
                      .filter(item => item.customer_email !== 'public')
                      .map((instance) => {
                        const isInstanceExpired = new Date(instance.expires_at) < new Date() && instance.status === 'active';
                        return (
                          <div key={instance.id} className="p-3.5 flex items-center justify-between text-[11px] font-bold text-slate-750 hover:bg-slate-50/50 transition-all">
                            <div className="min-w-0 pr-2">
                              <span className="text-slate-900 block truncate">{instance.customer_email}</span>
                              <span className="text-[9px] text-slate-400 block font-semibold leading-none mt-1">
                                Claimed: {new Date(instance.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <select
                                value={instance.status}
                                onChange={(e) => handleStatusChange(instance.id, e.target.value)}
                                className={`px-2 py-0.5 rounded-lg text-[9px] font-bold border cursor-pointer focus:outline-none ${instance.status === 'redeemed'
                                    ? 'bg-amber-50 text-amber-600 border-amber-200'
                                    : isInstanceExpired
                                      ? 'bg-red-50 text-red-500 border-red-200'
                                      : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                  }`}
                              >
                                <option value="active">Active</option>
                                <option value="redeemed">Redeemed</option>
                              </select>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Create Coupon modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[160] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-100 max-w-md w-full shadow-2xl p-6 flex flex-col space-y-5 animate-scale-in text-slate-800 text-left">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Ticket className="text-brand-orange" size={20} />
                <span>Create VIP Coupon Offer</span>
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 hover:bg-slate-50 text-slate-400 hover:text-slate-700 rounded-lg transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCoupon} className="space-y-4">

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Coupon Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Free Mango Lassi"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Coupon Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. LASSI_FREE"
                  value={newCouponCode}
                  onChange={(e) => setNewCouponCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Discount Label</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Select"
                  value={customDiscountLabel}
                  onChange={(e) => setCustomDiscountLabel(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none"
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
                        onChange={(e) => handleImageFileChange(e, false)}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Coupon Issue Scope</label>
                <div className="flex items-center space-x-4 mt-2">
                  <label className="flex items-center space-x-2 text-xs font-bold text-slate-750 cursor-pointer">
                    <input
                      type="radio"
                      name="issueScope"
                      value="public"
                      checked={issueScope === 'public'}
                      onChange={() => setIssueScope('public')}
                      className="accent-brand-orange"
                    />
                    <span>Public to Everyone</span>
                  </label>
                  <label className="flex items-center space-x-2 text-xs font-bold text-slate-750 cursor-pointer">
                    <input
                      type="radio"
                      name="issueScope"
                      value="targeted"
                      checked={issueScope === 'targeted'}
                      onChange={() => setIssueScope('targeted')}
                      className="accent-brand-orange"
                    />
                    <span>Targeted Customer Email</span>
                  </label>
                </div>
              </div>

              {issueScope === 'targeted' && (
                <div className="animate-fade-in">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Customer Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. guest@spoonfull.nl"
                    value={newCustomerEmail}
                    onChange={(e) => setNewCustomerEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none"
                  />
                </div>
              )}

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
                  {isCreating ? 'Creating...' : 'Create Offer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Scan & Redeem Modal */}
      {isScanModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[160] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-100 max-w-md w-full shadow-2xl p-6 flex flex-col space-y-4 animate-scale-in text-slate-800">
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
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
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
                  className="w-full bg-slate-50 border border-slate-200 text-slate-850 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white transition-all font-mono"
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
              <div className={`p-4 rounded-2xl border text-xs font-bold flex flex-col items-center text-center space-y-2.5 ${scanResult.success
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