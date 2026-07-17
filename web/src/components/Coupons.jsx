import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Search, CheckCircle2, AlertTriangle, Clock, RefreshCw, Ticket } from 'lucide-react';

export default function Coupons() {
  const [coupons, setCoupons] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [redeemingId, setRedeemingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, redeemed

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

    // Subscribe to realtime database changes on issued_coupons table
    const channel = supabase
      .channel('realtime-issued-coupons')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'issued_coupons' }, (payload) => {
        console.log('Realtime coupon update payload:', payload);
        if (payload.eventType === 'INSERT') {
          setCoupons(prev => [payload.new, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
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
  const activeCount = coupons.filter(c => c.status === 'active').length;
  const redeemedCount = coupons.filter(c => c.status === 'redeemed').length;

  const isLimitReached = activeCount >= 200;

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
        <button
          onClick={fetchCoupons}
          className="flex items-center gap-1.5 py-2 px-3.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95"
        >
          <RefreshCw size={14} />
          <span>Refresh List</span>
        </button>
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
              <span className="text-xs font-bold text-slate-400">/ 200 Max</span>
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
                        {coupon.status === 'redeemed' ? (
                          <span className="px-2.5 py-1 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-bold inline-flex items-center gap-1">
                            <CheckCircle2 size={10} />
                            <span>Redeemed</span>
                          </span>
                        ) : isExpired ? (
                          <span className="px-2.5 py-1 bg-red-50 text-red-500 rounded-lg text-[10px] font-bold inline-flex items-center gap-1">
                            <AlertTriangle size={10} />
                            <span>Expired</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold inline-flex items-center gap-1">
                            <Clock size={10} />
                            <span>Active</span>
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-5 text-right">
                        {coupon.status === 'active' && !isExpired && (
                          <button
                            disabled={redeemingId === coupon.id}
                            onClick={() => handleRedeem(coupon.id)}
                            className="py-1.5 px-3 bg-brand-orange hover:bg-opacity-95 text-white font-bold rounded-lg text-[10px] shadow-sm cursor-pointer active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none uppercase tracking-wider"
                          >
                            {redeemingId === coupon.id ? 'Redeeming...' : 'Redeem Coupon'}
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

    </div>
  );
}