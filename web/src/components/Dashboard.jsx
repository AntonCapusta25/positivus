import React, { useState, useMemo, useEffect } from 'react';
import { usePOS, getDriverUrl } from '../context/POSContext';
import { ShoppingCart, Phone, MapPin, ClipboardList, CheckCircle, Clock, Check, Printer, UserCheck, Navigation, Download, CheckCircle2, ChevronRight, X, QrCode, ChevronLeft } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

const parseItems = (items) => {
  if (!items) return [];
  if (Array.isArray(items)) return items;
  if (typeof items === 'string') {
    try {
      return JSON.parse(items);
    } catch (e) {
      console.error("Failed to parse order items:", e);
      return [];
    }
  }
  return [];
};

export default function Dashboard() {
  const { orders, updateOrderStatus, cancelAndRefundOrder, updateOrderPrinted, triggerTestPrint, setActiveIncomingOrder, assignOrderDriver, settings, drivers, availableMerchants } = usePOS();
  const [activeTab, setActiveTab] = useState('prepare'); // prepare, handover, done
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [showMobileDetail, setShowMobileDetail] = useState(false);
  const [itemChecklist, setItemChecklist] = useState({});
  const [isSavingDriver, setIsSavingDriver] = useState(false);
  const [printToast, setPrintToast] = useState(null);
  const [showPrintMenu, setShowPrintMenu] = useState(false);
  const [activePrintMenuOrderId, setActivePrintMenuOrderId] = useState(null);

  useEffect(() => {
    const handleClickOutside = () => setActivePrintMenuOrderId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // Filter orders according to active tab
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const status = (order.status || 'incoming').toLowerCase();
      if (activeTab === 'prepare') return status === 'incoming' || status === 'preparing';
      if (activeTab === 'handover') return status === 'ready';
      if (activeTab === 'done') return status === 'completed' || status === 'cancelled';
      return true;
    });
  }, [orders, activeTab]);

  // Done orders count to show in tab title
  const doneCount = useMemo(() => {
    return orders.filter(o => {
      const status = (o.status || '').toLowerCase();
      return status === 'completed' || status === 'cancelled';
    }).length;
  }, [orders]);

  // Select first order automatically when tab switches; reset mobile detail view
  React.useEffect(() => {
    setShowMobileDetail(false);
    if (filteredOrders.length > 0) {
      setSelectedOrderId(filteredOrders[0].id);
    } else {
      setSelectedOrderId(null);
    }
  }, [activeTab]);

  const selectedOrder = orders.find(o => o.id === selectedOrderId);

  // Calculates elapsed minutes since created_at
  const getElapsedMinutes = (dateStr) => {
    try {
      const date = new Date(dateStr);
      const diffMs = new Date() - date;
      return Math.max(0, Math.floor(diffMs / 60000));
    } catch (e) {
      return 0;
    }
  };

  const getAgeColor = (minutes) => {
    if (minutes < 10) return { bg: 'bg-emerald-50', border: 'border-emerald-500', text: 'text-emerald-600' };
    if (minutes < 20) return { bg: 'bg-amber-50', border: 'border-amber-500', text: 'text-amber-600' };
    return { bg: 'bg-red-50', border: 'border-red-500', text: 'text-red-600' };
  };

  const handleNextStatus = (order) => {
    const status = (order.status || 'incoming').toLowerCase();
    if (status === 'incoming') {
      setActiveIncomingOrder(order);
      return;
    }
    
    let next = 'completed';
    if (status === 'preparing') next = 'ready';
    else if (status === 'ready') next = 'completed';

    updateOrderStatus(order.id, next);
  };

  const handlePrint = async (e, order, printType = 'BOTH') => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!order) return;
    const label = order.order_number || (order.id ? String(order.id).slice(0, 6) : '');
    setPrintToast(`Sending print request for #${label}...`);
    try {
      const res = await triggerTestPrint(order, printType);
      if (res && res.success) {
        setPrintToast(`✓ Receipt #${label} sent to POS printer!`);
      } else {
        setPrintToast(`✓ Print request sent for #${label}`);
      }
    } catch (err) {
      setPrintToast(`⚠ Print request sent for #${label}`);
    }
    setTimeout(() => setPrintToast(null), 3000);
  };


  const toggleChecklistItem = (orderId, index) => {
    const key = `${orderId}-${index}`;
    setItemChecklist(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-12 overflow-hidden bg-slate-50 relative">
      {/* Floating Remote Print Toast Notification */}
      {printToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 backdrop-blur-md text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg border border-slate-800 flex items-center space-x-2 transition-all duration-300">
          <Printer size={15} className="text-brand-orange" />
          <span>{printToast}</span>
        </div>
      )}
      
      {/* Left Column: Master Order List Pane (lg:col-span-5) — hidden on mobile when detail is open */}
      <div className={`lg:col-span-5 flex flex-col min-h-0 border-r border-slate-200 bg-white h-full ${showMobileDetail ? 'hidden lg:flex' : 'flex'}`}>
        {/* Navigation Tabs */}
        <div className="grid grid-cols-3 gap-2 p-4 border-b border-slate-100 bg-white">
          <button
            type="button"
            onClick={() => setActiveTab('prepare')}
            className={`py-3 px-2 text-center rounded-xl font-bold text-sm transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'prepare'
                ? 'bg-brand-orange text-white'
                : 'bg-slate-50 text-slate-500 border border-slate-200/60'
            }`}
          >
            <span>Prepare</span>
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab('handover')}
            className={`py-3 px-2 text-center rounded-xl font-bold text-sm transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'handover'
                ? 'bg-brand-orange text-white'
                : 'bg-slate-50 text-slate-500 border border-slate-200/60'
            }`}
          >
            <span>Handover</span>
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab('done')}
            className={`py-3 px-2 text-center rounded-xl font-bold text-sm transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'done'
                ? 'bg-brand-orange text-white'
                : 'bg-slate-50 text-slate-500 border border-slate-200/60'
            }`}
          >
            <span>Done ({doneCount})</span>
          </button>
        </div>

        {/* Scrollable Orders List Container */}
        <div className="flex-1 overflow-y-auto p-4 pb-[max(2rem,calc(env(safe-area-inset-bottom)+1.5rem))] space-y-3">
          {filteredOrders.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-slate-400 space-y-2">
              <ClipboardList size={36} className="text-slate-300" />
              <p className="text-sm font-semibold">No active orders in this tab</p>
            </div>
          ) : (
            filteredOrders.map(order => {
              const isSelected = order.id === selectedOrderId;
              const isDone = activeTab === 'done';
              const elapsed = getElapsedMinutes(order.created_at);
              const colorInfo = getAgeColor(elapsed);
              const itemsArray = parseItems(order.items);
              const itemCount = itemsArray.reduce((s, i) => s + (i.quantity || 1), 0);
              const merchantObj = (availableMerchants || []).find(m => m.id === order.merchant_id || m.slug === order.merchant_id || m.raw_details?.id === order.merchant_id);
              const merchantName = merchantObj?.name || 'Spoonfull';

              return (
                <div
                  key={order.id}
                  onClick={() => { setSelectedOrderId(order.id); setShowMobileDetail(true); }}
                  className={`p-4 rounded-2xl border transition-all duration-150 cursor-pointer flex items-center space-x-4 ${
                    isSelected
                      ? 'border-brand-orange bg-brand-light/20 shadow-sm'
                      : 'border-slate-100 hover:border-slate-200 bg-white hover:bg-slate-50/40'
                  }`}
                >
                  {/* Circle status/time badge */}
                  <div className={`w-12 h-12 rounded-full border flex flex-col items-center justify-center shrink-0 ${
                    isDone ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : `${colorInfo.bg} ${colorInfo.border} ${colorInfo.text}`
                  }`}>
                    {isDone ? (
                      <Check size={20} className="stroke-[3]" />
                    ) : (
                      <>
                        <span className="text-sm font-bold leading-none">{elapsed}</span>
                        <span className="text-[9px] font-bold uppercase tracking-wider">min</span>
                      </>
                    )}
                  </div>

                  {/* Order info details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 min-w-0">
                        <h4 className="text-sm font-bold text-slate-800 truncate">
                          {order.customer_name?.split(' ')[0] || 'Guest Customer'}
                        </h4>
                        <span className="bg-slate-100 text-slate-500 font-extrabold text-[8px] px-1.5 py-0.5 rounded uppercase tracking-wider block truncate max-w-[75px]" title={merchantName}>
                          {merchantName}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-slate-800 shrink-0">
                        €{Number(order.total || 0).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 text-xs text-slate-400 font-medium mt-1">
                      <span className="font-bold text-slate-500">#{order.order_number?.split('-').pop() || '0000'}</span>
                      <span>•</span>
                      <span className="capitalize">{order.type || 'Dine-In'}</span>
                      <span>•</span>
                      <span>{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
                    </div>
                  </div>

                  {/* Right printer state indicators & Quick Print Button */}
                  <div className="flex flex-col items-end space-y-2 shrink-0">
                    <div className={`w-2.5 h-2.5 rounded-full ${order.printed ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                    <button
                      type="button"
                      onClick={(e) => handlePrint(e, order, 'BOTH')}
                      title="Print Receipt"
                      className="p-2 border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-600 hover:text-slate-900 transition-all shadow-sm flex items-center justify-center active:scale-95"
                    >
                      <Printer size={16} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Column: Order Detail View Panel (lg:col-span-7) — hidden on mobile when list is shown */}
      <div className={`lg:col-span-7 flex flex-col min-h-0 h-full bg-slate-50 ${!showMobileDetail ? 'hidden lg:flex' : 'flex'}`}>
        {selectedOrder ? (
          <div className="flex flex-col h-full justify-between overflow-hidden">
            
            {/* Scrollable Detail Body Container */}
            <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4 lg:space-y-6">

              {/* Mobile Back Button */}
              <div className="lg:hidden">
                <button
                  type="button"
                  onClick={() => setShowMobileDetail(false)}
                  className="flex items-center space-x-1.5 text-slate-500 hover:text-slate-800 text-xs font-bold py-2 px-3 bg-white border border-slate-200 rounded-xl shadow-sm active:scale-95 transition-all"
                >
                  <ChevronLeft size={15} />
                  <span>Back to Orders</span>
                </button>
              </div>
              
              {/* Header card with big badge, address, and Scooter */}
              <div className="bg-brand-light/30 border border-brand-orange/10 p-5 rounded-2xl flex items-center space-x-4">
                <div className="w-14 h-14 rounded-full bg-white border border-brand-orange flex flex-col items-center justify-center text-brand-orange shadow-sm shrink-0">
                  <Clock size={20} />
                  <span className="text-[10px] font-bold uppercase tracking-wider mt-0.5">
                    {getElapsedMinutes(selectedOrder.created_at)}m
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-800 text-base leading-snug flex items-center space-x-2">
                    <MapPin size={16} className="text-brand-orange shrink-0" />
                    <span className="truncate">
                      {selectedOrder.customer_address || 'Dining Room / Table Order'}
                    </span>
                  </h3>
                  <div className="flex items-center space-x-3 text-xs text-slate-500 font-bold mt-1.5 flex-wrap gap-y-1.5">
                    {(() => {
                      const detailMerchantObj = (availableMerchants || []).find(m => m.id === selectedOrder.merchant_id || m.slug === selectedOrder.merchant_id || m.raw_details?.id === selectedOrder.merchant_id);
                      const detailMerchantName = detailMerchantObj?.name || 'Spoonfull';
                      return (
                        <span className="bg-brand-orange/10 text-brand-orange border border-brand-orange/20 px-2 py-0.5 rounded-md text-[10px] uppercase font-black tracking-wider flex items-center gap-1 shrink-0">
                          Store: {detailMerchantName}
                        </span>
                      );
                    })()}
                    <span>Order ID: #{selectedOrder.order_number}</span>
                    <span>•</span>
                    <span className="bg-white border border-slate-200 px-2 py-0.5 rounded-md capitalize">
                      {selectedOrder.type === 'delivery' ? '🛵 Delivery' : selectedOrder.type === 'pickup' ? '🏃 Pickup' : '🍽️ Dine-In'}
                    </span>
                    {(() => {
                      if (!selectedOrder.notes) return null;
                      try {
                        const parsed = JSON.parse(selectedOrder.notes);
                        const target = parsed.payload || parsed;
                        if (target.is_scheduled && target.delivery_timestamp_human) {
                          const t = target.delivery_timestamp_human;
                          return (
                            <span className="bg-rose-100 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-md text-[10px] font-black tracking-wide animate-pulse">
                              📅 Scheduled: {t.local_date} {t.local_time}
                            </span>
                          );
                        }
                      } catch (e) {}
                      return null;
                    })()}
                  </div>
                </div>
              </div>

              {/* Customer collapser/card details with Phone & Notes */}
              <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h4 className="font-bold text-slate-800 text-sm">Customer contact details</h4>
                  {(() => {
                    const isPaid = selectedOrder.payment_status?.toLowerCase() === 'paid' || selectedOrder.payment_method?.toLowerCase() === 'online';
                    return (
                      <button
                        onClick={async () => {
                          const nextStatus = isPaid ? 'unpaid' : 'paid';
                          const confirmMsg = `Change payment status to ${nextStatus.toUpperCase()}?`;
                          if (window.confirm(confirmMsg)) {
                            await updateOrderStatus(selectedOrder.id, selectedOrder.status, nextStatus);
                            setSelectedOrder(prev => prev ? { ...prev, payment_status: nextStatus } : prev);
                          }
                        }}
                        className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                          isPaid
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100'
                        }`}
                        title="Click to toggle payment status"
                      >
                        {isPaid ? '✓ PAID' : '⚠️ NOT PAID'}
                      </button>
                    );
                  })()}
                </div>

                <div className="space-y-2.5 text-sm">
                  <div className="flex items-center space-x-2 text-slate-700">
                    <span className="font-bold text-slate-500">Name:</span>
                    <span>{selectedOrder.customer_name || 'Guest Customer'}</span>
                  </div>
                  {selectedOrder.customer_phone && (
                    <div className="flex items-center space-x-2 text-slate-700">
                      <Phone size={14} className="text-slate-400" />
                      <span className="font-bold text-slate-500">Phone:</span>
                      <a href={`tel:${selectedOrder.customer_phone}`} className="text-brand-orange hover:underline font-semibold">
                        {selectedOrder.customer_phone}
                      </a>
                    </div>
                  )}
                  {(() => {
                    if (!selectedOrder.notes) return null;
                    let displayNote = selectedOrder.notes;
                    if (typeof displayNote === 'string' && displayNote.trim().startsWith('{')) {
                      try {
                        const parsed = JSON.parse(displayNote);
                        const target = parsed.payload || parsed;
                        
                        let instructionsText = '';
                        if (Array.isArray(target.delivery_instructions)) {
                          instructionsText = target.delivery_instructions
                            .map(item => item.instruction || '')
                            .filter(Boolean)
                            .join(', ');
                        }
                        
                        displayNote = target.order_comment || target.notes || target.order_instruction || instructionsText || "System payload attached (No customer notes)";
                      } catch (e) {
                        // ignore
                      }
                    }
                    return (
                      <div className="bg-slate-50 p-3.5 rounded-xl text-xs text-slate-600 border border-slate-100 leading-relaxed overflow-hidden break-words">
                        <span className="font-bold text-slate-700 block mb-1">Fulfillment Notes:</span>
                        {displayNote}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Delivery Driver & Dispatch Management Panel */}
              {(selectedOrder.type === 'delivery' || selectedOrder.type === 'pickup') && (
                <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-md space-y-4 border border-slate-800">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-base">🛵</span>
                      <h4 className="font-bold text-sm text-white">Delivery Dispatch</h4>
                    </div>
                    {isSavingDriver && (
                      <span className="text-[10px] text-emerald-400 font-bold animate-pulse">Saving...</span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                        Assign Courier
                      </label>
                      <select
                        value={selectedOrder.driver_name || ''}
                        onChange={async (e) => {
                          const name = e.target.value;
                          setIsSavingDriver(true);
                          await assignOrderDriver(selectedOrder.id, name, selectedOrder.delivery_duration || 15);
                          setIsSavingDriver(false);
                        }}
                        className="w-full bg-slate-800 hover:bg-slate-750 border border-slate-755 text-white rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-orange"
                      >
                        <option value="">Unassigned</option>
                        {drivers.map(d => (
                          <option key={d.id} value={d.name}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                        Target Time: {selectedOrder.delivery_duration || 15} mins
                      </label>
                      <input
                        type="range"
                        min="10"
                        max="60"
                        step="5"
                        value={selectedOrder.delivery_duration || 15}
                        onChange={async (e) => {
                          const duration = parseInt(e.target.value);
                          setIsSavingDriver(true);
                          await assignOrderDriver(selectedOrder.id, selectedOrder.driver_name || '', duration);
                          setIsSavingDriver(false);
                        }}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-orange mt-2"
                      />
                    </div>
                  </div>

                  {/* Driver App QR Code for scanning directly off screen */}
                  <div className="flex flex-col items-center justify-center pt-4 border-t border-slate-800 space-y-2">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block text-center">
                      Scan to Claim (Driver App)
                    </span>
                    {(() => {
                      const driverUrl = getDriverUrl(selectedOrder.id);
                      return (
                        <div className="flex flex-col items-center space-y-1.5">
                          <div className="bg-white p-2 rounded-xl flex items-center justify-center shadow-inner">
                            <QRCodeSVG value={driverUrl} size={100} />
                          </div>
                          <span className="text-[8px] font-mono text-slate-500 block truncate max-w-[200px] text-center">
                            {driverUrl}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Items items list checklist */}
              <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
                <h4 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3">
                  Preparation checklist (Chef View)
                </h4>

                <div className="space-y-3">
                  {parseItems(selectedOrder.items).map((item, index) => {
                    const isChecked = !!itemChecklist[`${selectedOrder.id}-${index}`];
                    return (
                      <div
                        key={index}
                        onClick={() => toggleChecklistItem(selectedOrder.id, index)}
                        className={`flex items-start justify-between p-2 rounded-xl transition-all cursor-pointer ${
                          isChecked ? 'bg-slate-50 text-slate-400' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          {/* Checklist tick box */}
                          <div className={`w-5 h-5 rounded border flex items-center justify-center mt-0.5 shrink-0 ${
                            isChecked 
                              ? 'bg-emerald-500 border-emerald-500 text-white' 
                              : 'border-slate-300 bg-white'
                          }`}>
                            {isChecked && <Check size={14} className="stroke-[3]" />}
                          </div>
                          <div>
                            <span className={`font-semibold text-sm ${isChecked ? 'line-through' : 'text-slate-800'}`}>
                              {item.quantity}× {item.name}
                            </span>
                            {item.notes && (
                              <span className="block text-xs text-amber-600 mt-0.5">Note: {item.notes}</span>
                            )}
                          </div>
                        </div>
                        <span className={`text-sm font-semibold ${isChecked ? 'line-through text-slate-300' : 'text-slate-700'}`}>
                          €{Number((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Totals calculations pricing summary */}
              <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-2.5 text-sm">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span>€{Number(selectedOrder.subtotal || 0).toFixed(2)}</span>
                </div>
                {selectedOrder.delivery_fee > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>Delivery Charge</span>
                    <span>€{Number(selectedOrder.delivery_fee || 0).toFixed(2)}</span>
                  </div>
                )}
                {selectedOrder.discount > 0 && (
                  <div className="flex justify-between text-rose-500">
                    <span>Discount</span>
                    <span>-€{Number(selectedOrder.discount || 0).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-500">
                  <span>BTW (Tax included)</span>
                  <span>€{Number(selectedOrder.tax || 0).toFixed(2)}</span>
                </div>
                {(() => {
                  if (!selectedOrder.notes) return null;
                  try {
                    const parsed = JSON.parse(selectedOrder.notes);
                    const target = parsed.payload || parsed;
                    const tip = target.cart?.tip_amount || target.tip_amount;
                    if (tip > 0) {
                      return (
                        <div className="flex justify-between text-slate-600 font-semibold bg-emerald-50/40 px-2 py-1 rounded">
                          <span>Driver Tip</span>
                          <span className="text-emerald-600 font-bold">€{Number(tip).toFixed(2)}</span>
                        </div>
                      );
                    }
                  } catch (e) {}
                  return null;
                })()}
                <div className="border-t border-slate-100 pt-2.5 flex justify-between font-bold text-slate-800 text-base">
                  <span>Total amount</span>
                  <span className="text-brand-orange">€{Number(selectedOrder.total || 0).toFixed(2)}</span>
                </div>
                {(() => {
                  if (!selectedOrder.notes) return null;
                  try {
                    const parsed = JSON.parse(selectedOrder.notes);
                    const target = parsed.payload || parsed;
                    if (target.is_scheduled && target.delivery_timestamp_human) {
                      const t = target.delivery_timestamp_human;
                      return (
                        <div className="border-t border-rose-100 pt-2.5 flex justify-between text-rose-700 font-bold text-sm bg-rose-50/60 -mx-5 px-5 pb-2 rounded-b-2xl">
                          <span>📅 Scheduled Delivery</span>
                          <span>{t.local_date} · {t.local_time}</span>
                        </div>
                      );
                    }
                  } catch (e) {}
                  return null;
                })()}
              </div>

            </div>

            {/* Bottom button bar controls */}
            <div className="p-3.5 sm:p-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row gap-2.5 sm:gap-3 shrink-0 shadow-lg shadow-slate-100">
              
              {/* Primary Action Button (Mobile: top order-1, Desktop: right flex-1 order-3) */}
              {selectedOrder.status !== 'completed' && selectedOrder.status !== 'cancelled' && (
                <button
                  type="button"
                  onClick={() => handleNextStatus(selectedOrder)}
                  className="w-full sm:flex-1 order-1 sm:order-3 py-3.5 px-4 bg-brand-orange hover:bg-opacity-95 text-white font-extrabold rounded-xl text-sm sm:text-base transition-all shadow-md shadow-brand-orange/15 uppercase tracking-wide text-center active:scale-98"
                >
                  {selectedOrder.status === 'incoming' 
                    ? 'Accept Order' 
                    : selectedOrder.status === 'preparing' 
                      ? 'Order is Ready' 
                      : 'Mark as Handed Over'
                  }
                </button>
              )}

              {/* Secondary Actions Row (Mobile: bottom order-2, Desktop: inline order-1 & order-2) */}
              <div className={`flex items-center gap-2.5 w-full sm:w-auto order-2 sm:order-1 ${selectedOrder.status === 'completed' || selectedOrder.status === 'cancelled' ? 'w-full' : ''}`}>
                {/* Split Print Button with type selector */}
                <div className={`relative shrink-0 ${selectedOrder.status === 'completed' || selectedOrder.status === 'cancelled' ? 'w-full sm:w-auto' : 'flex-1 sm:flex-initial'}`} id="print-split-btn">
                  <div className="flex rounded-xl overflow-hidden border border-slate-200 shadow-sm w-full">
                    {/* Main print button — always BOTH */}
                    <button
                      type="button"
                      onClick={(e) => { setShowPrintMenu(false); handlePrint(e, selectedOrder, 'BOTH'); }}
                      className="flex-1 sm:flex-initial px-3.5 sm:px-4 py-3 bg-white hover:bg-slate-50 text-slate-700 font-bold transition-all flex items-center justify-center space-x-2 active:scale-95 border-r border-slate-200 text-xs sm:text-sm"
                    >
                      <Printer size={16} />
                      <span>Print</span>
                    </button>
                    {/* Arrow — opens type menu */}
                    <button
                      type="button"
                      id="print-menu-toggle"
                      onClick={(e) => { e.stopPropagation(); setShowPrintMenu(v => !v); }}
                      className="px-2.5 py-3 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-all active:scale-95"
                      title="Choose print type"
                    >
                      <ChevronRight size={15} className={`transition-transform duration-200 ${showPrintMenu ? 'rotate-90' : 'rotate-0'}`} />
                    </button>
                  </div>

                  {/* Dropdown menu */}
                  {showPrintMenu && (
                    <div
                      className="absolute bottom-full mb-2 left-0 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden min-w-[170px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {[
                        { label: '🖨️ Both (Store + Customer)', type: 'BOTH' },
                        { label: '🏪 Store Copy Only', type: 'STORE' },
                        { label: '👤 Customer Copy Only', type: 'CUSTOMER' },
                        { label: '🖨️🖨️ 2× Store Copies', type: 'STORE2' },
                        { label: '🖨️🖨️🖨️ 3× Store Copies', type: 'STORE3' },
                      ].map(({ label, type }) => (
                        <button
                          key={type}
                          type="button"
                          onClick={(e) => { setShowPrintMenu(false); handlePrint(e, selectedOrder, type); }}
                          className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 font-medium transition-colors flex items-center space-x-2"
                        >
                          <span>{label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Cancel button */}
                {selectedOrder.status !== 'completed' && selectedOrder.status !== 'cancelled' && (
                  <button
                    type="button"
                    onClick={async () => {
                      const isOnline = selectedOrder.payment_method === 'online';
                      const msg = isOnline 
                        ? "Are you sure you want to cancel and refund this online order?"
                        : "Are you sure you want to cancel this order?";
                      if (window.confirm(msg)) {
                        if (isOnline) {
                          await cancelAndRefundOrder(selectedOrder.id);
                        } else {
                          await updateOrderStatus(selectedOrder.id, 'cancelled');
                        }
                      }
                    }}
                    className="flex-1 sm:flex-initial px-3.5 py-3 border border-rose-200 hover:bg-rose-50 text-rose-600 font-bold rounded-xl text-xs transition-all uppercase tracking-wider whitespace-nowrap text-center"
                  >
                    {selectedOrder.payment_method === 'online' ? 'Cancel & Refund' : 'Cancel Order'}
                  </button>
                )}
              </div>

            </div>

          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3">
            <ClipboardList size={48} className="text-slate-300" />
            <p className="text-base font-semibold">Select an order from the list to view details</p>
          </div>
        )}
      </div>

    </div>
  );
}
