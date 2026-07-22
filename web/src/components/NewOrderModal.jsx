import React, { useState } from 'react';
import { usePOS } from '../context/POSContext';
import { Play, Plus, Minus, Bell, Printer, ShoppingBag, X, PlusCircle, MinusCircle } from 'lucide-react';

export default function NewOrderModal() {
  const { activeIncomingOrder, setActiveIncomingOrder, acceptOrder, updateOrderStatus, assignOrderDriver, drivers, availableMerchants, settings, sirenActive, stopSirenAlert } = usePOS();
  const [prepTime, setPrepTime] = useState(25); // Default preparation time: 25 mins
  const [selectedDriver, setSelectedDriver] = useState('');

  if (!activeIncomingOrder) return null;

  const order = activeIncomingOrder;
  const activeMerchant = availableMerchants.find(m => m.id === order.merchant_id) || { name: 'Spoonful' };

  // Parse items
  let parsedItems = [];
  try {
    parsedItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
  } catch (e) {
    parsedItems = [];
  }

  const handleIncrement = () => {
    setPrepTime(prev => Math.min(120, prev + 5));
  };

  const handleDecrement = () => {
    setPrepTime(prev => Math.max(5, prev - 5));
  };

  const addPreset = (mins) => {
    setPrepTime(prev => Math.min(120, prev + mins));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-4 animate-fade-in">
      
      {/* Modal Dialog */}
      <div className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] animate-scale-up">
        
        {/* Glowing Orange Header Banner */}
        <div className="bg-gradient-to-r from-brand-orange to-amber-500 text-white p-5 relative flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Bell size={20} className="text-white fill-current" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-black tracking-widest text-orange-100 block">
                {activeMerchant.name ? activeMerchant.name.toUpperCase() : 'SPOONFUL'}
              </span>
              <h2 className="text-lg font-black tracking-tight leading-none my-0.5">
                New Order #{order.order_number || order.id.substring(0, 8).toUpperCase()}
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {sirenActive && (
              <button
                onClick={stopSirenAlert}
                className="bg-rose-600 hover:bg-rose-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider animate-pulse flex items-center space-x-1 border border-rose-500 shadow-md transition-all active:scale-95 shrink-0"
              >
                <span>🚨 Mute</span>
              </button>
            )}
            <button 
              type="button"
              onClick={() => {
                stopSirenAlert();
                setActiveIncomingOrder(null);
              }}
              className="p-1.5 hover:bg-white/10 rounded-full transition-all text-white/80 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Contents Grid */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* Customer Info Card & Loyalty Badge */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base font-black text-slate-800">
                  {order.customer_name || 'Customer'}
                </span>
                
                {/* Loyalty Pill */}
                {order.customer_order_count > 1 ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    ✨ Returning ({order.customer_order_count}th order)
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    🔥 New Customer
                  </span>
                )}
                
                {/* Order Type Badge */}
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  (order.type || '').toLowerCase() === 'delivery'
                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                    : (order.type || '').toLowerCase() === 'pickup'
                      ? 'bg-purple-100 text-purple-800 border border-purple-200'
                      : 'bg-slate-100 text-slate-800 border border-slate-200'
                }`}>
                  {order.type || 'Dine-In'}
                </span>
              </div>
              
              {order.customer_phone && (
                <p className="text-xs text-slate-500 font-bold flex items-center space-x-1">
                  <span>📞 {order.customer_phone}</span>
                </p>
              )}
            </div>

            {/* Address (Only for delivery orders) */}
            {(order.type || '').toLowerCase() === 'delivery' && order.customer_address && (
              <div className="text-left md:text-right max-w-xs space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                  Delivery Address
                </span>
                <p className="text-xs font-extrabold text-slate-700 leading-normal line-clamp-2">
                  📍 {order.customer_address}
                </p>
              </div>
            )}
          </div>

          {/* Items Summary & Prep Time Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left Col: Order Items checklist */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                <ShoppingBag size={14} />
                <span>Order Items ({parsedItems.length})</span>
              </h3>
              
              <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-4 divide-y divide-slate-100 max-h-[220px] overflow-y-auto">
                {parsedItems.map((item, idx) => (
                  <div key={idx} className="py-2.5 flex justify-between items-start first:pt-0 last:pb-0">
                    <div className="space-y-0.5">
                      <span className="text-sm font-bold text-slate-800">{item.name}</span>
                      {item.notes && (
                        <span className="text-xs text-brand-orange font-semibold block">✍️ {item.notes}</span>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 shrink-0 pl-3">
                      <span className="text-xs font-bold text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-md">
                        x{item.quantity}
                      </span>
                      <span className="text-sm font-extrabold text-slate-800">
                        €{(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {(() => {
                if (!order.notes) return null;
                let displayNote = order.notes;
                try {
                  const parsed = JSON.parse(order.notes);
                  displayNote = parsed.order_comment || parsed.delivery_instructions || parsed.notes || parsed.order_instruction || "";
                } catch (e) {
                  // Keep raw
                }
                if (!displayNote) return null;
                return (
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                    <span className="text-[10px] font-bold text-amber-500 uppercase block mb-1">Customer Note</span>
                    <p className="text-xs font-semibold text-slate-700 leading-normal">{displayNote}</p>
                  </div>
                );
              })()}
            </div>

            {/* Right Col: Clockwise Style Preparation Time Clock Dial */}
            <div className="flex flex-col items-center justify-center bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider text-center block">
                Estimated Preparation Time
              </span>

              {/* Big circular Clockwise Dial */}
              <div className="flex items-center space-x-4">
                
                {/* Minus Button */}
                <button
                  type="button"
                  onClick={handleDecrement}
                  className="p-1.5 hover:text-brand-orange text-slate-400 hover:bg-white rounded-full transition-all border border-transparent hover:border-slate-100 shadow-sm"
                >
                  <MinusCircle size={32} />
                </button>

                {/* Dial Circle */}
                <div className="w-36 h-36 rounded-full border-4 border-dashed border-brand-orange bg-white flex flex-col items-center justify-center relative shadow-md shadow-brand-orange/5">
                  {/* Decorative Clock Ticks in background */}
                  <div className="absolute inset-2 rounded-full border border-slate-100 pointer-events-none flex items-center justify-center">
                    <div className="w-1 h-3 bg-slate-200 absolute top-0 rounded-full" />
                    <div className="w-3 h-1 bg-slate-200 absolute right-0 rounded-full" />
                    <div className="w-1 h-3 bg-slate-200 absolute bottom-0 rounded-full" />
                    <div className="w-3 h-1 bg-slate-200 absolute left-0 rounded-full" />
                  </div>

                  <span className="text-4xl font-black text-slate-800 tracking-tight z-10">
                    {prepTime}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 z-10 -mt-0.5">
                    Minutes
                  </span>
                </div>

                {/* Plus Button */}
                <button
                  type="button"
                  onClick={handleIncrement}
                  className="p-1.5 hover:text-brand-orange text-slate-400 hover:bg-white rounded-full transition-all border border-transparent hover:border-slate-100 shadow-sm"
                >
                  <PlusCircle size={32} />
                </button>
              </div>

              {/* Speed presets chips */}
              <div className="flex flex-wrap gap-1.5 justify-center pt-1">
                <button
                  type="button"
                  onClick={() => addPreset(5)}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-all"
                >
                  +5m
                </button>
                <button
                  type="button"
                  onClick={() => addPreset(10)}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-all"
                >
                  +10m
                </button>
                <button
                  type="button"
                  onClick={() => addPreset(15)}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-all"
                >
                  +15m
                </button>
                <button
                  type="button"
                  onClick={() => addPreset(20)}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-all"
                >
                  +20m
                </button>
              </div>

              {/* Driver Selector for Delivery Orders */}
              {(order.type || '').toLowerCase() === 'delivery' && (
                <div className="w-full pt-2 border-t border-slate-100 flex flex-col items-center">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Assign Delivery Driver
                  </label>
                  <select
                    value={selectedDriver}
                    onChange={(e) => setSelectedDriver(e.target.value)}
                    className="w-full max-w-xs bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm focus:outline-none focus:border-brand-orange"
                  >
                    <option value="">Unassigned (Claim via QR)</option>
                    {(drivers || []).map((d) => (
                      <option key={d.id} value={d.name}>
                        🛵 {d.name} {d.phone ? `(${d.phone})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

          </div>

        </div>

        {/* Action Buttons in Footer */}
        <div className="bg-slate-50 border-t border-slate-100 p-6 flex space-x-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              stopSirenAlert();
              updateOrderStatus(order.id, 'cancelled');
              setActiveIncomingOrder(null);
            }}
            className="flex-1 py-3 px-4 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-2xl text-sm font-bold transition-all"
          >
            Decline Order
          </button>
          
          <button
            type="button"
            onClick={async () => {
              stopSirenAlert();
              if (selectedDriver) {
                await assignOrderDriver(order.id, selectedDriver, 15);
              }
              acceptOrder(order.id, prepTime);
            }}
            className="flex-[2] py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-95 text-white rounded-2xl text-sm font-black transition-all flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/10"
          >
            <Printer size={16} />
            <span>Accept & Print Receipt</span>
          </button>
        </div>

      </div>
    </div>
  );
}
