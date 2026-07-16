import React, { useState } from 'react';
import { usePOS } from '../context/POSContext';
import { Bike, Plus, Trash2, Clock, MapPin, CheckCircle, Phone, Shield } from 'lucide-react';

export default function Drivers() {
  const { 
    drivers, 
    createDriver, 
    deleteDriver, 
    orders, 
    settings 
  } = usePOS();

  // Add driver form states
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverPin, setNewDriverPin] = useState('1234');
  const [newDriverPhone, setNewDriverPhone] = useState('');
  const [driverError, setDriverError] = useState('');
  const [isAddingDriver, setIsAddingDriver] = useState(false);

  const handleAddDriver = async (e) => {
    e.preventDefault();
    setDriverError('');
    setIsAddingDriver(true);
    const res = await createDriver(newDriverName, newDriverPin, newDriverPhone);
    setIsAddingDriver(false);
    if (res.success) {
      setNewDriverName('');
      setNewDriverPin('1234');
      setNewDriverPhone('');
    } else {
      setDriverError(res.error);
    }
  };

  // Helper: Find active delivery order for a specific driver
  const getDriverActiveOrder = (driverName) => {
    if (!driverName) return null;
    return orders.find(o => 
      o.driver_name === driverName && 
      (o.status === 'dispatched' || o.status === 'preparing' || o.status === 'ready')
    );
  };

  // Compute status counts
  const totalDrivers = drivers.length;
  const activeDeliveryDrivers = drivers.filter(d => getDriverActiveOrder(d.name) !== null).length;
  const idleDrivers = totalDrivers - activeDeliveryDrivers;

  return (
    <div className="p-6 space-y-8 bg-slate-50/50 min-h-full">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Delivery Couriers</h2>
          <p className="text-sm text-slate-400 font-medium">Manage driver personnel, logins, and track active deliveries</p>
        </div>
        
        {/* Quick Stats Grid */}
        <div className="flex space-x-3 shrink-0">
          <div className="bg-white border border-slate-100 rounded-2xl p-4 min-w-[120px] shadow-sm flex flex-col justify-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Couriers</span>
            <span className="text-xl font-black text-slate-800 mt-1">{totalDrivers}</span>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 min-w-[120px] shadow-sm flex flex-col justify-center">
            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider block">Idle / Ready</span>
            <span className="text-xl font-black text-emerald-600 mt-1">{idleDrivers}</span>
          </div>
          <div className="bg-brand-orange/10 border border-brand-orange/20 rounded-2xl p-4 min-w-[120px] shadow-sm flex flex-col justify-center">
            <span className="text-[10px] font-bold text-brand-orange uppercase tracking-wider block">Delivering</span>
            <span className="text-xl font-black text-brand-orange mt-1">{activeDeliveryDrivers}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
        {/* Left Column: Create Courier Form */}
        <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-6">
          <div>
            <h3 className="font-extrabold text-slate-800 text-base flex items-center space-x-2">
              <span className="bg-brand-orange/10 p-1.5 rounded-lg text-brand-orange">
                <Plus className="w-4 h-4" />
              </span>
              <span>Register New Courier</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">Create driver profile credentials for mobile app logins</p>
          </div>

          <form onSubmit={handleAddDriver} className="space-y-4">
            {driverError && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold rounded-xl">
                {driverError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Courier Full Name</label>
              <input
                type="text"
                required
                placeholder="e.g. John Doe"
                value={newDriverName}
                onChange={(e) => setNewDriverName(e.target.value)}
                className="w-full bg-slate-50/50 border border-slate-200 focus:border-brand-orange rounded-xl px-4 py-3 text-xs focus:outline-none text-slate-700 font-semibold transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Login PIN (4 digits)</label>
              <input
                type="text"
                required
                maxLength="4"
                value={newDriverPin}
                onChange={(e) => setNewDriverPin(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-slate-50/50 border border-slate-200 focus:border-brand-orange rounded-xl px-4 py-3 text-xs focus:outline-none text-slate-700 font-mono font-bold transition-all text-center tracking-widest"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Phone Number</label>
              <input
                type="tel"
                placeholder="e.g. +31612345678"
                value={newDriverPhone}
                onChange={(e) => setNewDriverPhone(e.target.value)}
                className="w-full bg-slate-50/50 border border-slate-200 focus:border-brand-orange rounded-xl px-4 py-3 text-xs focus:outline-none text-slate-700 font-semibold transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isAddingDriver}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center space-x-2"
            >
              <span>{isAddingDriver ? 'Registering...' : 'Register Courier'}</span>
            </button>
          </form>
        </div>

        {/* Right Column: Personnel List & Active Statuses */}
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 text-base">Active Personnel Dashboard</h3>
              <span className="bg-slate-100 text-slate-600 font-bold px-3 py-1 rounded-full text-[10px] uppercase tracking-wider">
                Live Status
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {drivers.map(d => {
                const activeOrder = getDriverActiveOrder(d.name);
                
                return (
                  <div key={d.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-slate-50/20 transition-all">
                    {/* Courier Basic Info */}
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-2xl bg-brand-orange/10 flex items-center justify-center text-brand-orange shrink-0">
                          <Bike className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm flex items-center space-x-2">
                            <span>{d.name}</span>
                            {activeOrder ? (
                              <span className="bg-brand-orange/15 text-brand-orange font-bold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center space-x-1 shrink-0">
                                <span className="w-1 h-1 bg-brand-orange rounded-full animate-ping" />
                                <span>Delivering</span>
                              </span>
                            ) : (
                              <span className="bg-emerald-100 text-emerald-600 font-bold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                                Idle
                              </span>
                            )}
                          </h4>
                          <div className="flex items-center space-x-3 text-[11px] text-slate-400 mt-1 font-semibold">
                            <span className="flex items-center space-x-1">
                              <Shield className="w-3 h-3 text-slate-400" />
                              <span className="font-mono text-brand-orange">{d.passcode}</span>
                            </span>
                            {d.phone && (
                              <span className="flex items-center space-x-1">
                                <Phone className="w-3 h-3 text-slate-400" />
                                <span>{d.phone}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Active Delivery Status */}
                    {activeOrder ? (
                      <div className="flex-1 md:max-w-md bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Current Task</span>
                            <span className="text-xs font-black text-slate-800">
                              Order #{activeOrder.order_number} ({activeOrder.type})
                            </span>
                          </div>
                          <span className="text-[10px] font-extrabold text-slate-500 bg-white border border-slate-200 px-2.5 py-0.5 rounded-full flex items-center space-x-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{activeOrder.delivery_duration || 15}m</span>
                          </span>
                        </div>

                        {activeOrder.customer_address && (
                          <div className="flex items-start space-x-1.5 text-xs text-slate-500 font-semibold leading-relaxed">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{activeOrder.customer_address.replace('\n', ' ')}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between border-t border-slate-150/70 pt-2 text-xs font-bold text-slate-600">
                          <span>Customer: {activeOrder.customer_name}</span>
                          <span className="text-brand-orange font-black">€{Number(activeOrder.total).toFixed(2)}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 md:max-w-xs text-right text-xs text-slate-400 font-bold flex items-center justify-end space-x-1.5">
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                        <span>Ready for dispatch</span>
                      </div>
                    )}

                    {/* Delete Action Button */}
                    <div className="shrink-0 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to remove courier profile for ${d.name}?`)) {
                            deleteDriver(d.id);
                          }
                        }}
                        className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-500 hover:text-rose-600 rounded-xl transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {drivers.length === 0 && (
                <div className="p-8 text-center text-slate-400 font-medium space-y-2">
                  <p className="text-sm">No couriers registered yet.</p>
                  <p className="text-xs text-slate-350">Add driver profiles on the left to see them appear here.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}