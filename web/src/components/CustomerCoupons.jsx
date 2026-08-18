import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Ticket, Clock, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

export default function CustomerCoupons({ email }) {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinCode, setPinCode] = useState('');
  const [pinError, setPinError] = useState('');
  const [redeemedCoupon, setRedeemedCoupon] = useState(null);
  const [now, setNow] = useState(Date.now());

  // Clock tick every second for real-time countdown timer
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (email) {
      fetchCustomerCoupons();
    } else {
      setLoading(false);
    }
  }, [email]);

  const fetchCustomerCoupons = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('issued_coupons')
        .select('*')
        .eq('customer_email', email.toLowerCase().trim())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCoupons(data || []);
    } catch (err) {
      console.error('Error fetching customer coupons:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePinSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!selectedCoupon) return;

    setPinError('');

    try {
      // 1. Securely check if the entered PIN matches any merchant
      const { data: merchant, error: mErr } = await supabase
        .from('merchants')
        .select('merchant_id')
        .eq('admin_pin', pinCode.trim())
        .limit(1)
        .maybeSingle();

      if (mErr || !merchant) {
        setPinError('Invalid Admin PIN. Please ask staff to try again.');
        setPinCode('');
        return;
      }

      // 2. Mark coupon as redeemed in database
      const { error: rErr } = await supabase
        .from('issued_coupons')
        .update({
          status: 'redeemed',
          redeemed_at: new Date().toISOString()
        })
        .eq('id', selectedCoupon.id);

      if (rErr) throw rErr;

      // 3. Trigger success
      setRedeemedCoupon(selectedCoupon);
      setShowPinModal(false);
      setPinCode('');
      
      // Update local state list
      setCoupons(prev => prev.map(c => c.id === selectedCoupon.id ? { ...c, status: 'redeemed', redeemed_at: new Date().toISOString() } : c));
    } catch (err) {
      setPinError('Failed to redeem: ' + err.message);
    }
  };

  const activeCoupons = coupons.filter(c => c.status === 'active' && new Date(c.expires_at) >= new Date());
  const historyCoupons = coupons.filter(c => c.status === 'redeemed' || new Date(c.expires_at) < new Date());

  const renderTimer = (expiresAt) => {
    const diff = new Date(expiresAt).getTime() - now;
    if (diff <= 0) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-50 text-red-500 border border-red-100 font-mono mt-1 shrink-0">
          Expired
        </span>
      );
    }
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    const pad = (num) => String(num).padStart(2, '0');
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-600 border border-amber-100 font-mono mt-1 shrink-0">
        ⏳ {days}d {pad(hours)}:{pad(minutes)}:{pad(seconds)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4 text-center">
        <div className="text-slate-500 text-xs font-black uppercase tracking-widest animate-pulse">
          Fetching Your Loyalty Cards...
        </div>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4 text-center">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-sm text-slate-800">
          <span className="text-4xl">❌</span>
          <h3 className="text-base font-black text-slate-900">Missing Customer Context</h3>
          <p className="text-xs text-slate-500 font-semibold leading-relaxed">
            Please access this page using the magic link sent to your email after your successful purchase.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col p-4 sm:p-6 font-sans">
      
      {/* Header Info */}
      <header className="max-w-md w-full mx-auto text-center py-8 shrink-0 space-y-1.5">
        <span className="inline-block text-[10px] font-extrabold uppercase tracking-widest text-brand-orange bg-orange-50 border border-orange-100 px-3 py-1 rounded-full">
          Spoonfull VIP Club
        </span>
        <h2 className="text-xl font-black tracking-tight text-slate-900">
          Your Loyalty Wallet
        </h2>
        <p className="text-xs text-slate-500 font-semibold truncate max-w-xs mx-auto">
          Linked to: {email}
        </p>
      </header>

      {/* Main Listing */}
      <main className="flex-1 max-w-md w-full mx-auto space-y-6">
        
        {/* Active Coupons Section */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1.5">
            Active Rewards ({activeCoupons.length})
          </h3>
          
          {activeCoupons.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center text-slate-400 text-xs font-bold space-y-1 shadow-sm">
              <Ticket className="mx-auto text-slate-300 mb-1" size={28} />
              <p>No active coupons right now.</p>
              <p className="text-[10px] text-slate-500">Complete another purchase to receive rewards!</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {activeCoupons.map((coupon) => {
                const diff = new Date(coupon.expires_at).getTime() - now;
                const isCouponExpired = diff <= 0;

                return (
                  <div key={coupon.id} className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col">
                    
                    {/* Coupon Card Top Body */}
                    <div className="p-4 flex items-center space-x-3.5">
                      {coupon.image_url ? (
                        <img src={coupon.image_url} className="w-14 h-14 rounded-2xl object-cover border border-slate-100 shadow-sm" alt="" />
                      ) : (
                        <span className="w-14 h-14 bg-orange-50 text-brand-orange rounded-2xl flex items-center justify-center text-xl shrink-0 border border-orange-100">🏷️</span>
                      )}

                      <div className="flex-1 min-w-0">
                        <span className="text-[9px] font-black uppercase tracking-widest text-brand-orange block">
                          {coupon.discount_label}
                        </span>
                        <h4 className="font-black text-slate-900 text-sm truncate mt-0.5">
                          {coupon.title}
                        </h4>
                        <div className="flex items-center space-x-1.5">
                          {renderTimer(coupon.expires_at)}
                        </div>
                      </div>

                      {/* Info Button */}
                      <button 
                        onClick={() => {
                          setSelectedCoupon(coupon);
                          setShowInfoModal(true);
                        }}
                        className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-200 rounded-xl transition-all cursor-pointer"
                        title="View Details"
                      >
                        <Info size={16} />
                      </button>
                    </div>

                    {/* Redeem Action Row */}
                    <div className="px-4 pb-4">
                      <button
                        onClick={() => {
                          setSelectedCoupon(coupon);
                          setShowPinModal(true);
                        }}
                        disabled={isCouponExpired}
                        className="w-full py-2.5 bg-brand-orange hover:bg-opacity-95 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md shadow-brand-orange/15 transition-all cursor-pointer active:scale-[0.98] disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed disabled:shadow-none"
                      >
                        {isCouponExpired ? 'Expired' : 'Redeem in Restaurant'}
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Claim History Section */}
        <div className="space-y-3 pt-2">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1.5">
            Claim History ({historyCoupons.length})
          </h3>
          
          {historyCoupons.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 text-center text-slate-400 text-xs font-bold shadow-sm">
              <p>No redemption history yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {historyCoupons.map((coupon) => {
                const isClaimed = coupon.status === 'redeemed';
                return (
                  <div key={coupon.id} className="bg-white/70 border border-slate-200/80 rounded-2xl p-3 flex items-center justify-between text-xs font-bold text-slate-500 shadow-sm opacity-80">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <span className="text-base shrink-0">{isClaimed ? '✅' : '⚠️'}</span>
                      <div className="truncate">
                        <span className="text-slate-800 block truncate">{coupon.title}</span>
                        <span className="text-[9px] text-slate-400 block font-normal leading-none mt-1">
                          {isClaimed 
                            ? `Redeemed: ${new Date(coupon.redeemed_at).toLocaleDateString()}`
                            : `Expired: ${new Date(coupon.expires_at).toLocaleDateString()}`
                          }
                        </span>
                      </div>
                    </div>
                    <span className={`text-[9px] uppercase tracking-wider font-extrabold shrink-0 px-2 py-0.5 rounded-md ${
                      isClaimed ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
                    }`}>
                      {isClaimed ? 'Redeemed' : 'Expired'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </main>

      {/* Info Modal Explanation */}
      {showInfoModal && selectedCoupon && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-100 rounded-3xl max-w-sm w-full p-5 flex flex-col space-y-4 shadow-2xl animate-scale-in text-slate-800">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
              <h4 className="text-xs font-black uppercase tracking-widest text-brand-orange">Coupon Details</h4>
              <button onClick={() => setShowInfoModal(false)} className="text-slate-400 hover:text-slate-800 transition-all cursor-pointer">
                <X size={16} />
              </button>
            </div>
            
            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-900">{selectedCoupon.title}</h3>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                This exclusive coupon gives you access to the "{selectedCoupon.title}" reward at Spoonfull. 
              </p>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-150 text-[11px] font-bold text-slate-600 space-y-2">
              <div className="flex justify-between">
                <span>Verification Code:</span>
                <span className="text-slate-900 font-mono">{selectedCoupon.coupon_code}</span>
              </div>
              <div className="flex justify-between">
                <span>Redemption Window:</span>
                <span className="text-emerald-600">Valid until {new Date(selectedCoupon.expires_at).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Linked Customer:</span>
                <span className="text-slate-900 truncate max-w-[150px]">{selectedCoupon.customer_email}</span>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 font-medium leading-relaxed">
              <strong>Rules:</strong> To redeem this voucher, present this screen to the counter staff when placing your order. Staff will verify the reward by entering the restaurant's security PIN directly on your device.
            </div>

            <button 
              onClick={() => setShowInfoModal(false)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Admin PIN Validation Modal */}
      {showPinModal && selectedCoupon && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-100 rounded-3xl max-w-sm w-full p-5 flex flex-col space-y-4 shadow-2xl animate-scale-in text-slate-800">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
              <h4 className="text-xs font-black uppercase tracking-widest text-emerald-500">Staff Verification</h4>
              <button onClick={() => { setShowPinModal(false); setPinCode(''); setPinError(''); }} className="text-slate-400 hover:text-slate-800 transition-all cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-sm font-black text-slate-900">Staff Admin PIN Required</h3>
              <p className="text-xs text-slate-500 font-semibold leading-normal">
                Please present this screen to the waiter or cashier to enter their secret PIN and redeem the reward.
              </p>
            </div>

            <form onSubmit={handlePinSubmit} className="space-y-4">
              <input 
                type="password"
                required
                autoFocus
                maxLength={8}
                placeholder="••••"
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 text-center text-xl font-black tracking-widest focus:outline-none focus:border-brand-orange transition-all font-mono"
              />

              {pinError && (
                <div className="text-red-500 text-[10px] font-bold text-center animate-shake">
                  {pinError}
                </div>
              )}

              <div className="flex space-x-2">
                <button 
                  type="button"
                  onClick={() => { setShowPinModal(false); setPinCode(''); setPinError(''); }}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Confirm PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Successful Redemption Overlay Screen */}
      {redeemedCoupon && (
        <div className="fixed inset-0 bg-slate-950 z-[10000] flex flex-col items-center justify-center p-6 text-center animate-fade-in text-slate-800">
          <div className="bg-white border border-slate-100 rounded-3xl p-8 max-w-sm w-full flex flex-col items-center space-y-5 shadow-2xl">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center animate-bounce">
              <CheckCircle size={36} className="stroke-[2.5]" />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Transaction Complete</span>
              <h3 className="text-base font-black text-slate-900">Coupon Redeemed!</h3>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                Staff has verified and approved the discount: <br />
                <strong className="text-slate-900 text-sm block mt-1">"{redeemedCoupon.title}"</strong>
              </p>
            </div>

            <div className="w-full bg-slate-50 p-3 rounded-2xl border border-slate-150 text-[10px] font-bold text-slate-600 space-y-1.5 text-left">
              <div>Coupon Code: <span className="text-slate-900 font-mono">{redeemedCoupon.coupon_code}</span></div>
              <div>Redeemed At: <span className="text-slate-900">{new Date().toLocaleString()}</span></div>
              <div>Status: <span className="text-emerald-600">APPROVED & REDEEMED</span></div>
            </div>

            <button 
              onClick={() => setRedeemedCoupon(null)}
              className="w-full py-2.5 bg-brand-orange hover:bg-opacity-95 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer"
            >
              Back to My Cards
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
