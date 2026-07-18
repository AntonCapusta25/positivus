import React, { useState, useMemo } from 'react';
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
  const { orders, updateOrderStatus, updateOrderPrinted, triggerTestPrint, setActiveIncomingOrder, assignOrderDriver, settings, drivers } = usePOS();
  const [activeTab, setActiveTab] = useState('prepare'); // prepare, handover, done
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [showMobileDetail, setShowMobileDetail] = useState(false);
  const [itemChecklist, setItemChecklist] = useState({});
  const [printPreviewOrder, setPrintPreviewOrder] = useState(null);
  const [isSavingDriver, setIsSavingDriver] = useState(false);

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

  const handlePrint = (order) => {
    setPrintPreviewOrder(order);
    updateOrderPrinted(order.id, true);
  };

  const toggleChecklistItem = (orderId, index) => {
    const key = `${orderId}-${index}`;
    setItemChecklist(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-12 overflow-hidden bg-slate-50">
      
      {/* Left Column: Master Order List Pane (lg:col-span-5) — hidden on mobile when detail is open */}
      <div className={`lg:col-span-5 flex-col border-r border-slate-200 bg-white h-full ${showMobileDetail ? 'hidden lg:flex' : 'flex'}`}>
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
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
                      <h4 className="text-sm font-bold text-slate-800 truncate">
                        {order.customer_name?.split(' ')[0] || 'Guest Customer'}
                      </h4>
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

                  {/* Right printer state indicators & Quick Print */}
                  <div className="flex flex-col items-end space-y-2 shrink-0">
                    <div className={`w-2.5 h-2.5 rounded-full ${order.printed ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrint(order);
                      }}
                      title="Quick Print Receipt"
                      className="p-1.5 border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-all shadow-sm"
                    >
                      <Printer size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Column: Order Detail View Panel (lg:col-span-7) — hidden on mobile when list is shown */}
      <div className={`lg:col-span-7 flex-col h-full bg-slate-50 ${!showMobileDetail ? 'hidden lg:flex' : 'flex'}`}>
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
                  <div className="flex items-center space-x-3 text-xs text-slate-500 font-bold mt-1.5">
                    <span>Order ID: #{selectedOrder.order_number}</span>
                    <span>•</span>
                    <span className="bg-white border border-slate-200 px-2 py-0.5 rounded-md capitalize">
                      {selectedOrder.type === 'delivery' ? '🛵 Delivery' : selectedOrder.type === 'pickup' ? '🏃 Pickup' : '🍽️ Dine-In'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Customer collapser/card details with Phone & Notes */}
              <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h4 className="font-bold text-slate-800 text-sm">Customer contact details</h4>
                  <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-md ${
                    selectedOrder.payment_status?.toLowerCase() === 'paid'
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                      : 'bg-amber-50 text-amber-600 border border-amber-100'
                  }`}>
                    {selectedOrder.payment_status || 'Pending'}
                  </span>
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
                        displayNote = parsed.order_comment || parsed.delivery_instructions || parsed.notes || parsed.order_instruction || "System payload attached (No customer notes)";
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
                <div className="border-t border-slate-100 pt-2.5 flex justify-between font-bold text-slate-800 text-base">
                  <span>Total amount</span>
                  <span className="text-brand-orange">€{Number(selectedOrder.total || 0).toFixed(2)}</span>
                </div>
              </div>

            </div>

            {/* Bottom button bar controls */}
            <div className="p-4 bg-white border-t border-slate-200 flex items-center space-x-3 shrink-0 shadow-lg shadow-slate-100">
              {/* Print Receipt Trigger */}
              <button
                type="button"
                onClick={() => handlePrint(selectedOrder)}
                className="p-3.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-all flex items-center justify-center shrink-0"
              >
                <Printer size={20} />
              </button>

              {/* Order Status Shift Transition Button */}
              {selectedOrder.status !== 'completed' && selectedOrder.status !== 'cancelled' && (
                <button
                  type="button"
                  onClick={() => handleNextStatus(selectedOrder)}
                  className="flex-1 py-3.5 bg-brand-orange hover:bg-opacity-95 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-brand-orange/10 uppercase tracking-wide"
                >
                  {selectedOrder.status === 'incoming' 
                    ? 'Accept Order' 
                    : selectedOrder.status === 'preparing' 
                      ? 'Order is Ready' 
                      : 'Mark as Handed Over'
                  }
                </button>
              )}
            </div>

          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3">
            <ClipboardList size={48} className="text-slate-300" />
            <p className="text-base font-semibold">Select an order from the list to view details</p>
          </div>
        )}
      </div>

      {/* Side-by-Side Thermal Receipt Print Preview Modal */}
      {printPreviewOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex justify-center p-4 md:p-8 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl flex flex-col shadow-2xl animate-fade-in my-auto">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2">
                <Printer className="text-brand-orange" size={20} />
                <h3 className="text-base font-extrabold text-white">Dual Thermal Receipt Copies</h3>
              </div>
              <button
                onClick={() => setPrintPreviewOrder(null)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-950/50">
              
              {/* COPY 1: KITCHEN & DELIVERY RECEIPT */}
              <div className="thermal-receipt p-6 rounded-xl space-y-4 text-slate-850">
                <div className="text-center space-y-1">
                  <h4 className="font-black text-sm uppercase tracking-wide text-slate-900">Spoonful Delivery</h4>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Copy 1: Courier & Kitchen</p>
                </div>
                <div className="border-t border-b border-dashed border-slate-300 py-2.5 text-xs space-y-1">
                  <div className="flex justify-between font-bold">
                    <span>Order No:</span>
                    <span>#{printPreviewOrder.order_number || printPreviewOrder.id.slice(0,8)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <span>{new Date(printPreviewOrder.created_at || Date.now()).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Courier:</span>
                    <span className="font-extrabold text-brand-orange">{printPreviewOrder.driver_name || 'Unassigned'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ETA Limit:</span>
                    <span className="font-extrabold">{printPreviewOrder.delivery_duration || 15} mins</span>
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <p className="font-extrabold text-[11px] uppercase tracking-wider mb-1">Destination Address</p>
                  <p className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-semibold leading-relaxed text-slate-700">
                    {printPreviewOrder.customer_address || 'No destination address specified'}
                  </p>
                </div>

                {/* Items List */}
                <div className="space-y-1.5 text-xs">
                  <p className="font-extrabold text-[11px] uppercase tracking-wider mb-1">Items Checklist</p>
                  <div className="space-y-1.5">
                    {parseItems(printPreviewOrder.items).map((item, idx) => (
                      <div key={idx} className="flex justify-between font-semibold">
                        <span>{item.name} x{item.quantity}</span>
                        <span>€{Number(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Driver App QR Code */}
                <div className="text-center border-t border-dashed border-slate-300 pt-4 space-y-1.5">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">
                    Scan for driver route GPS
                  </span>
                  {(() => {
                    const driverUrl = getDriverUrl(printPreviewOrder.id);
                    return (
                      <div className="space-y-1.5">
                        <div className="mx-auto w-32 h-32 bg-white p-1 border border-slate-200 rounded-lg shadow-sm flex items-center justify-center">
                          <QRCodeSVG value={driverUrl} size={120} />
                        </div>
                        <span className="text-[8px] font-mono text-slate-400 block truncate max-w-full">
                          {driverUrl}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* COPY 2: CUSTOMER RECEIPT */}
              <div className="thermal-receipt p-6 rounded-xl space-y-4 text-slate-850">
                <div className="text-center space-y-1">
                  <h4 className="font-black text-sm uppercase tracking-wide text-slate-900">Spoonful Guest</h4>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Copy 2: Customer Copy</p>
                </div>
                <div className="border-t border-b border-dashed border-slate-300 py-2.5 text-xs space-y-1">
                  <div className="flex justify-between font-bold">
                    <span>Order No:</span>
                    <span>#{printPreviewOrder.order_number || printPreviewOrder.id.slice(0,8)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Customer Name:</span>
                    <span>{printPreviewOrder.customer_name || 'Guest'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Phone:</span>
                    <span>{printPreviewOrder.customer_phone || 'None'}</span>
                  </div>
                </div>

                {/* Items List */}
                <div className="space-y-1.5 text-xs">
                  <p className="font-extrabold text-[11px] uppercase tracking-wider mb-1">Receipt Summary</p>
                  <div className="space-y-1 border-b border-dashed border-slate-300 pb-2">
                    {parseItems(printPreviewOrder.items).map((item, idx) => (
                      <div key={idx} className="flex justify-between font-semibold">
                        <span>{item.name} x{item.quantity}</span>
                        <span>€{Number(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1 pt-1 font-semibold text-slate-650">
                    <div className="flex justify-between text-[11px]">
                      <span>Subtotal:</span>
                      <span>€{Number(printPreviewOrder.subtotal || 0).toFixed(2)}</span>
                    </div>
                    {printPreviewOrder.delivery_fee > 0 && (
                      <div className="flex justify-between text-[11px]">
                        <span>Delivery Fee:</span>
                        <span>€{Number(printPreviewOrder.delivery_fee || 0).toFixed(2)}</span>
                      </div>
                    )}
                    {printPreviewOrder.discount > 0 && (
                      <div className="flex justify-between text-[11px] text-rose-500">
                        <span>Discount:</span>
                        <span>-€{Number(printPreviewOrder.discount || 0).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs font-black text-slate-800 border-t border-slate-200 pt-1.5">
                      <span>Total Paid:</span>
                      <span>€{Number(printPreviewOrder.total || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* App Download QR Code */}
                <div className="text-center border-t border-dashed border-slate-300 pt-4 space-y-1.5">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">
                    Download customer order App
                  </span>
                  <div className="space-y-1">
                    <div className="mx-auto w-32 h-32 bg-white p-1 border border-slate-200 rounded-lg shadow-sm flex items-center justify-center">
                      <QRCodeSVG value={settings.appStoreLink || 'https://spoonful.com/app'} size={120} />
                    </div>
                    <div className="flex justify-center space-x-1.5 text-[8px] font-extrabold text-slate-400 uppercase">
                      <span>App Store</span>
                      <span>•</span>
                      <span>Play Store</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-800 bg-slate-900 flex items-center justify-end space-x-3 shrink-0">
              <button
                onClick={() => setPrintPreviewOrder(null)}
                className="py-2 px-4 bg-slate-800 hover:bg-slate-750 text-white text-xs font-bold rounded-xl transition-all"
              >
                Close Preview
              </button>
              <button
                onClick={() => {
                  triggerTestPrint(printPreviewOrder);
                }}
                className="py-2 px-5 bg-brand-orange hover:bg-opacity-95 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-brand-orange/15"
              >
                Print / Reprint Receipt
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
