import React, { useState } from 'react';
import { usePOS } from '../context/POSContext';
import { Store, CheckCircle, XCircle, Settings, ArrowRight, Shield, Zap, Search, Plus, ExternalLink, Clock, ShoppingBag } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function MyStores() {
  const { 
    availableMerchants, 
    setAvailableMerchants,
    settings, 
    setSettings, 
    orders, 
    superadminName,
    toggleRestaurantOpen,
    restaurantOpen,
    registerMerchant,
    registerPOSMachine,
    fetchPOSMachines,
    deletePOSMachine,
    userRole
  } = usePOS();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStoreDetail, setSelectedStoreDetail] = useState(null);
  const [editingStoreName, setEditingStoreName] = useState('');
  const [prepTimeInput, setPrepTimeInput] = useState('20');
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // New Registration states
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [newMerchantId, setNewMerchantId] = useState('');
  const [newMerchantName, setNewMerchantName] = useState('');
  const [newMerchantPin, setNewMerchantPin] = useState('1234');
  const [isRegisteringStore, setIsRegisteringStore] = useState(false);

  // POS Terminals list & registry state
  const [activeModalTab, setActiveModalTab] = useState('general'); // general | terminals
  const [posMachines, setPosMachines] = useState([]);
  const [newPOSName, setNewPOSName] = useState('');
  const [isRegisteringPOS, setIsRegisteringPOS] = useState(false);
  const [generatedPOSCode, setGeneratedPOSCode] = useState('');

  // Filter merchants search
  const filteredMerchants = availableMerchants.filter(m => {
    const name = (m.name || m.id).toLowerCase();
    const query = searchTerm.toLowerCase();
    return name.includes(query) || m.id.toLowerCase().includes(query);
  });

  const handleSelectStore = (merchantId) => {
    setSettings(prev => ({ ...prev, merchantId }));
    localStorage.setItem('pos_authenticated_merchant', merchantId);
    setSuccessMsg(`Active store context switched to ${availableMerchants.find(m => m.id === merchantId)?.name || merchantId}`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleToggleStoreOpen = async (merchantId, currentOpen) => {
    const nextState = !currentOpen;
    // Update local availableMerchants list
    setAvailableMerchants(prev => prev.map(m => m.id === merchantId ? { ...m, is_open: nextState, is_accepting_orders: nextState } : m));
    
    // Update Supabase
    try {
      await supabase
        .from('merchants')
        .update({ 
          is_open: nextState, 
          is_accepting_orders: nextState,
          updated_at: new Date().toISOString()
        })
        .eq('merchant_id', merchantId);

      // If active store, update global toggle
      if (merchantId === settings.merchantId) {
        toggleRestaurantOpen();
      }
    } catch (e) {
      console.error("Failed to toggle store open status:", e);
    }
  };

  const handleOpenStoreModal = async (store) => {
    setSelectedStoreDetail(store);
    setEditingStoreName(store.name || store.id);
    setPrepTimeInput(settings.preparationTime || 20);
    setActiveModalTab('general');
    setGeneratedPOSCode('');
    setNewPOSName('');
    setPosMachines([]);

    const res = await fetchPOSMachines(store.id);
    if (res.success) {
      setPosMachines(res.data || []);
    }
  };

  const handleSaveStoreAdjustments = async (e) => {
    e.preventDefault();
    if (!selectedStoreDetail) return;
    setIsSaving(true);

    try {
      const updatedName = editingStoreName.trim();
      const updatedPrep = parseInt(prepTimeInput, 10) || 20;

      // 1. Update in local availableMerchants list
      setAvailableMerchants(prev => prev.map(m => m.id === selectedStoreDetail.id ? { ...m, name: updatedName } : m));

      // 2. Update Supabase merchants table
      await supabase
        .from('merchants')
        .update({ 
          name: updatedName,
          updated_at: new Date().toISOString()
        })
        .eq('merchant_id', selectedStoreDetail.id);

      // 3. If active store, update local settings
      if (selectedStoreDetail.id === settings.merchantId) {
        setSettings(prev => ({
          ...prev,
          preparationTime: updatedPrep
        }));
      }

      setSuccessMsg(`Store adjustments for ${updatedName} saved successfully!`);
      setSelectedStoreDetail(null);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      alert("Failed to save store adjustments: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegisterStore = async (e) => {
    e.preventDefault();
    setIsRegisteringStore(true);
    const res = await registerMerchant(newMerchantId, newMerchantName, newMerchantPin);
    setIsRegisteringStore(false);
    if (res.success) {
      setSuccessMsg(`Restaurant ${newMerchantName} registered successfully!`);
      setNewMerchantId('');
      setNewMerchantName('');
      setNewMerchantPin('1234');
      setIsRegisterModalOpen(false);
      setTimeout(() => setSuccessMsg(''), 3000);
    } else {
      alert("Failed to register restaurant: " + res.error);
    }
  };

  const handleRegisterPOS = async (e) => {
    e.preventDefault();
    setIsRegisteringPOS(true);
    const res = await registerPOSMachine(newPOSName, selectedStoreDetail.id);
    setIsRegisteringPOS(false);
    if (res.success) {
      setGeneratedPOSCode(res.code);
      setNewPOSName('');
      const updated = await fetchPOSMachines(selectedStoreDetail.id);
      if (updated.success) {
        setPosMachines(updated.data || []);
      }
    } else {
      alert("Failed to register terminal: " + res.error);
    }
  };

  const handleDeletePOS = async (id) => {
    if (!confirm("Are you sure you want to revoke this POS terminal? It will be disconnected immediately.")) return;
    const res = await deletePOSMachine(id);
    if (res.success) {
      const updated = await fetchPOSMachines(selectedStoreDetail.id);
      if (updated.success) {
        setPosMachines(updated.data || []);
      }
    } else {
      alert("Failed to delete terminal: " + res.error);
    }
  };

  return (
    <div className="p-6 space-y-8 bg-slate-50/50 min-h-full font-sans">
      
      {/* Superadmin Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-brand-orange/10 to-transparent pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="bg-yellow-400/20 text-yellow-400 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider flex items-center space-x-1.5">
                <Shield size={12} />
                <span>Superadmin Access — {superadminName || 'Admin'}</span>
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white my-0">
              Restaurant Stores & Locations
            </h2>
            <p className="text-xs md:text-sm text-slate-400 max-w-xl">
              Manage multi-restaurant configurations, toggle active store statuses, adjust prep times, and switch terminal operating contexts.
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl px-5 py-3 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Stores</span>
              <span className="text-xl font-black text-white">{availableMerchants.length}</span>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-5 py-3 text-center">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block">Active Context</span>
              <span className="text-sm font-extrabold text-emerald-400 truncate max-w-[140px] block">
                {availableMerchants.find(m => m.id === settings.merchantId)?.name || 'Default Store'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-2xl flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle size={16} className="text-emerald-500" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-500 hover:text-emerald-700">
            <XCircle size={16} />
          </button>
        </div>
      )}

      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search stores by name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-xs font-semibold focus:outline-none focus:border-brand-orange shadow-sm text-slate-700 transition-all"
            />
          </div>
          {userRole === 'superadmin' || availableMerchants.length === 0 ? (
            <button
              onClick={() => setIsRegisterModalOpen(true)}
              className="bg-brand-orange hover:bg-opacity-95 text-white font-bold px-5 py-3 rounded-2xl text-xs flex items-center gap-2 shadow-sm transition-all whitespace-nowrap active:scale-95"
              title="Register new restaurant location"
            >
              <Plus size={14} />
              <span>Register Store</span>
            </button>
          ) : (
            <div className="bg-slate-50 border border-slate-205 text-slate-500 font-bold px-4.5 py-3 rounded-2xl text-[10px] uppercase tracking-wider select-none">
              🔒 Admin (Single Store Limit)
            </div>
          )}
        </div>

        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Showing {filteredMerchants.length} of {availableMerchants.length} Stores
        </div>
      </div>

      {/* Stores Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredMerchants.map((store) => {
          const isActiveContext = store.id === settings.merchantId;
          const isOpen = store.is_open !== false && store.is_accepting_orders !== false;
          
          // Calculate store orders metrics
          const storeOrders = orders.filter(o => o.merchant_id === store.id || (!o.merchant_id && store.id === 'restaurant_1'));
          const activeOrders = storeOrders.filter(o => o.status === 'incoming' || o.status === 'preparing' || o.status === 'ready').length;
          const completedOrders = storeOrders.filter(o => o.status === 'completed').length;

          return (
            <div 
              key={store.id} 
              className={`bg-white border rounded-3xl p-6 shadow-sm flex flex-col justify-between transition-all hover:shadow-md relative ${
                isActiveContext ? 'border-brand-orange ring-2 ring-brand-orange/20' : 'border-slate-100'
              }`}
            >
              {/* Active Badge */}
              {isActiveContext && (
                <div className="absolute -top-3 right-6 bg-brand-orange text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-md">
                  Current Terminal Context
                </div>
              )}

              <div className="space-y-4">
                {/* Store Top Info */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${
                      isActiveContext ? 'bg-brand-orange/10 text-brand-orange' : 'bg-slate-100 text-slate-700'
                    }`}>
                      <Store size={22} />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-800 text-base my-0 truncate max-w-[180px]">
                        {store.name || store.id}
                      </h3>
                      <span className="text-[10px] font-mono text-slate-400 block truncate max-w-[180px]">
                        ID: {store.id}
                      </span>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <button
                    onClick={() => handleToggleStoreOpen(store.id, isOpen)}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-extrabold flex items-center space-x-1.5 transition-all ${
                      isOpen 
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100' 
                        : 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100'
                    }`}
                    title="Click to toggle store open/closed status"
                  >
                    <div className={`w-2 h-2 rounded-full ${isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                    <span>{isOpen ? 'Store Open' : 'Store Closed'}</span>
                  </button>
                </div>

                {/* Quick Store Stats */}
                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100/80 text-center">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Active</span>
                    <span className="text-sm font-black text-slate-800">{activeOrders}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Done</span>
                    <span className="text-sm font-black text-emerald-600">{completedOrders}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Total</span>
                    <span className="text-sm font-black text-slate-800">{storeOrders.length}</span>
                  </div>
                </div>
              </div>

              {/* Store Action Footer */}
              <div className="pt-6 border-t border-slate-100 flex items-center space-x-2 mt-4">
                {isActiveContext ? (
                  <button
                    disabled
                    className="flex-1 py-3 px-4 bg-emerald-50 text-emerald-700 font-extrabold rounded-xl text-xs flex items-center justify-center space-x-2 cursor-default"
                  >
                    <CheckCircle size={14} />
                    <span>Selected</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleSelectStore(store.id)}
                    className="flex-1 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl text-xs flex items-center justify-center space-x-2 transition-all shadow-sm active:scale-95"
                  >
                    <span>Switch to Store</span>
                    <ArrowRight size={14} />
                  </button>
                )}

                <button
                  onClick={() => handleOpenStoreModal(store)}
                  className="p-3 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-all"
                  title="Store Adjustments & Settings"
                >
                  <Settings size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>      {/* Store Adjustments Modal */}
      {selectedStoreDetail && (
        <div className="fixed inset-0 z-[300] bg-slate-950/80 backdrop-blur-sm flex justify-center items-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-6 animate-fade-in">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-brand-orange/10 text-brand-orange rounded-xl">
                  <Settings size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base my-0">Store Settings</h3>
                  <span className="text-[10px] text-slate-400 font-mono">ID: {selectedStoreDetail.id}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedStoreDetail(null)}
                className="p-1 text-slate-400 hover:text-slate-650 rounded-lg transition-all"
              >
                <XCircle size={20} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-100">
              <button
                type="button"
                onClick={() => setActiveModalTab('general')}
                className={`flex-1 pb-3 text-xs font-bold text-center border-b-2 transition-all ${
                  activeModalTab === 'general'
                    ? 'border-brand-orange text-brand-orange'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                General Settings
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab('terminals')}
                className={`flex-1 pb-3 text-xs font-bold text-center border-b-2 transition-all ${
                  activeModalTab === 'terminals'
                    ? 'border-brand-orange text-brand-orange'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                POS Terminals ({posMachines.length})
              </button>
            </div>

            {activeModalTab === 'general' ? (
              /* Modal Form */
              <form onSubmit={handleSaveStoreAdjustments} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Store Display Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editingStoreName}
                    onChange={(e) => setEditingStoreName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-brand-orange rounded-xl px-4 py-3 text-xs font-bold focus:outline-none text-slate-800"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Default Kitchen Prep Time (minutes)
                  </label>
                  <select
                    value={prepTimeInput}
                    onChange={(e) => setPrepTimeInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-brand-orange rounded-xl px-4 py-3 text-xs font-bold focus:outline-none text-slate-800 cursor-pointer"
                  >
                    <option value="15">15 Minutes (Fast)</option>
                    <option value="20">20 Minutes (Standard)</option>
                    <option value="30">30 Minutes (Busy Peak)</option>
                    <option value="45">45 Minutes (Heavy Backlog)</option>
                  </select>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Store Context Status
                  </span>
                  <p className="text-xs font-semibold text-slate-600">
                    {selectedStoreDetail.id === settings.merchantId ? (
                      <span className="text-emerald-600 font-bold">● Currently Active Terminal Context</span>
                    ) : (
                      <span>Inactive context (click "Switch to Store" on card to activate)</span>
                    )}
                  </p>
                </div>

                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedStoreDetail(null)}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 py-3 bg-brand-orange hover:bg-opacity-95 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-brand-orange/20"
                  >
                    {isSaving ? 'Saving...' : 'Save Adjustments'}
                  </button>
                </div>
              </form>
            ) : (
              /* POS Terminals Tab */
              <div className="space-y-6">
                
                {/* Registered List */}
                <div className="space-y-3">
                  <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Registered Terminals</span>
                  {posMachines.length === 0 ? (
                    <div className="p-4 border border-dashed border-slate-200 text-center rounded-2xl text-xs text-slate-450 font-medium">
                      No POS terminals registered for this location yet.
                    </div>
                  ) : (
                    <div className="max-h-[180px] overflow-y-auto border border-slate-100 rounded-2xl divide-y divide-slate-50">
                      {posMachines.map(pm => (
                        <div key={pm.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-all">
                          <div>
                            <span className="text-xs font-bold text-slate-700 block">{pm.name}</span>
                            <span className="text-[10px] font-mono text-slate-400">Code: <b className="text-brand-orange">{pm.registration_code}</b></span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeletePOS(pm.id)}
                            className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 transition-all"
                            title="De-register / Revoke terminal"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Generator Section */}
                <div className="p-4 bg-slate-50/80 border border-slate-100 rounded-2xl space-y-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">Link New POS Machine</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Registering a new terminal generates a temporary device linking passcode.</span>
                  </div>

                  {generatedPOSCode ? (
                    <div className="p-4 bg-amber-50 border border-amber-200 text-center rounded-2xl space-y-2">
                      <span className="text-[9px] font-black text-amber-800 uppercase tracking-widest block">USE THIS CODE ON DEVICE ONBOARDING</span>
                      <span className="text-2xl font-black text-brand-orange tracking-widest select-all">{generatedPOSCode}</span>
                      <button
                        type="button"
                        onClick={() => setGeneratedPOSCode('')}
                        className="text-[10px] font-bold text-amber-700 hover:text-amber-900 block mx-auto underline mt-1"
                      >
                        Generate another code
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleRegisterPOS} className="flex gap-2">
                      <input
                        type="text"
                        required
                        placeholder="Terminal name (e.g. Counter POS)"
                        value={newPOSName}
                        onChange={(e) => setNewPOSName(e.target.value)}
                        className="flex-1 bg-white border border-slate-200 focus:border-brand-orange rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none text-slate-800"
                      />
                      <button
                        type="submit"
                        disabled={isRegisteringPOS}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl text-xs whitespace-nowrap active:scale-95 transition-all"
                      >
                        {isRegisteringPOS ? 'Linking...' : 'Link Device'}
                      </button>
                    </form>
                  )}
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSelectedStoreDetail(null)}
                    className="py-3 px-6 bg-slate-100 hover:bg-slate-250 text-slate-750 font-bold rounded-xl text-xs transition-all"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Register Store Modal */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-[300] bg-slate-950/80 backdrop-blur-sm flex justify-center items-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-6 animate-fade-in">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-brand-orange/10 text-brand-orange rounded-xl">
                  <Plus size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base my-0">Register New Store</h3>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Create a new local restaurant merchant profile.</span>
                </div>
              </div>
              <button
                onClick={() => setIsRegisterModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-650 rounded-lg transition-all"
              >
                <XCircle size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleRegisterStore} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Merchant ID / Slug
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. raj-curry-house"
                  value={newMerchantId}
                  onChange={(e) => setNewMerchantId(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''))}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-brand-orange rounded-xl px-4 py-3 text-xs font-bold focus:outline-none text-slate-800"
                />
                <span className="text-[9px] text-slate-400 block">Lowercase alphanumeric, hyphens/underscores only.</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Restaurant Display Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Raj Curry House"
                  value={newMerchantName}
                  onChange={(e) => setNewMerchantName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-brand-orange rounded-xl px-4 py-3 text-xs font-bold focus:outline-none text-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Admin PIN Code (4 digits)
                </label>
                <input
                  type="text"
                  required
                  maxLength="4"
                  value={newMerchantPin}
                  onChange={(e) => setNewMerchantPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-brand-orange rounded-xl px-4 py-3 text-xs font-bold focus:outline-none text-slate-800 text-center font-mono tracking-widest"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRegisteringStore}
                  className="flex-1 py-3 bg-brand-orange hover:bg-opacity-95 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-brand-orange/20"
                >
                  {isRegisteringStore ? 'Registering...' : 'Register Restaurant'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
