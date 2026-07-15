import React from 'react';
import { usePOS } from '../context/POSContext';
import { Volume2, Printer, Sliders, Play, Save, RotateCcw, Zap } from 'lucide-react';

export default function Settings() {
  const { settings, setSettings, triggerTestPrint, playAlertSound, availableMerchants, createTestOrder, logoutMerchant, drivers, createDriver, deleteDriver } = usePOS();
  const [isPlacingTestOrder, setIsPlacingTestOrder] = React.useState(false);

  // Add driver form states
  const [newDriverName, setNewDriverName] = React.useState('');
  const [newDriverPin, setNewDriverPin] = React.useState('1234');
  const [newDriverPhone, setNewDriverPhone] = React.useState('');
  const [driverError, setDriverError] = React.useState('');
  const [isAddingDriver, setIsAddingDriver] = React.useState(false);

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

  const handleCreateTestOrder = async () => {
    setIsPlacingTestOrder(true);
    const result = await createTestOrder();
    setIsPlacingTestOrder(false);
    if (result.success) {
      alert(`Success! Test order placed on Hyperzod. Order ID: ${result.orderId}.\nIt will sync to Supabase shortly.`);
    } else {
      alert(`Failed to place test order: ${result.error}`);
    }
  };

  const handleToggleReceiptCustom = (field) => {
    setSettings(prev => ({
      ...prev,
      customiseReceipt: {
        ...prev.customiseReceipt,
        [field]: !prev.customiseReceipt[field]
      }
    }));
  };

  const handleToggleReceiptEnlarge = (field) => {
    setSettings(prev => ({
      ...prev,
      enlargeReceiptText: {
        ...prev.enlargeReceiptText,
        [field]: !prev.enlargeReceiptText[field]
      }
    }));
  };

  const handleVolumeChange = (e) => {
    const vol = parseInt(e.target.value);
    setSettings(prev => ({ ...prev, soundVolume: vol }));
  };

  const handleThemeChange = (theme) => {
    setSettings(prev => ({ ...prev, soundTheme: theme }));
  };

  const incrementCopies = () => {
    setSettings(prev => ({ ...prev, receiptCopies: Math.min(5, prev.receiptCopies + 1) }));
  };

  const decrementCopies = () => {
    setSettings(prev => ({ ...prev, receiptCopies: Math.max(1, prev.receiptCopies - 1) }));
  };

  const resetAll = () => {
    if (window.confirm('Reset all settings to defaults?')) {
      localStorage.removeItem('pos_settings');
      window.location.reload();
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Terminal Configuration</h2>
        <p className="text-sm text-slate-500">Configure alert volumes, hardware printers, and customized receipts</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Side: General Settings & Sound alerts */}
        <div className="space-y-6">
          {/* Identity & Session Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
            <h3 className="font-bold text-slate-800 flex items-center space-x-2">
              <Sliders size={18} className="text-brand-orange" />
              <span>Identity & Sync</span>
            </h3>
            
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-bold uppercase">Store Name</span>
                <span className="font-extrabold text-slate-800">
                  {availableMerchants.find(m => m.id === settings.merchantId)?.name || 'Spoonful'}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-bold uppercase">Merchant ID</span>
                <span className="font-mono text-slate-600 truncate max-w-[150px]">{settings.merchantId}</span>
              </div>
              <div className="flex justify-between items-center text-xs pt-1">
                <span className="text-slate-400 font-bold uppercase">Security Role</span>
                <span className="font-bold text-brand-orange bg-brand-light px-2 py-0.5 rounded text-[10px]">Restricted</span>
              </div>
              <button
                type="button"
                onClick={logoutMerchant}
                className="w-full mt-2.5 py-2 border border-slate-200 hover:bg-slate-100 text-rose-500 hover:text-rose-600 font-bold rounded-lg text-xs transition-all"
              >
                Sign Out / Lock Terminal
              </button>
            </div>
            
            <div className="flex items-center justify-between pt-1">
              <div className="space-y-0.5">
                <span className="text-sm font-semibold text-slate-700">Auto-Print Webhook Orders</span>
                <span className="text-xs text-slate-400 block">Print immediately when order is inserted</span>
              </div>
              <input
                type="checkbox"
                className="w-10 h-6 bg-slate-200 checked:bg-brand-orange rounded-full appearance-none relative before:content-[''] before:absolute before:w-5 before:h-5 before:bg-white before:rounded-full before:top-0.5 before:left-0.5 checked:before:left-4.5 before:transition-all cursor-pointer border border-slate-300"
                checked={settings.autoPrint}
                onChange={(e) => setSettings(prev => ({ ...prev, autoPrint: e.target.checked }))}
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-col space-y-2">
              <button
                type="button"
                onClick={handleCreateTestOrder}
                disabled={isPlacingTestOrder}
                className="w-full py-2.5 bg-brand-orange hover:bg-opacity-95 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 shadow-sm"
              >
                <Zap size={14} className={isPlacingTestOrder ? 'animate-bounce' : ''} />
                <span>{isPlacingTestOrder ? 'Creating on Hyperzod...' : 'Trigger Sandbox Order'}</span>
              </button>
              <p className="text-[10px] text-slate-400 text-center">
                Places a real order on Hyperzod sandbox API to test end-to-end sync.
              </p>
            </div>
          </div>

          {/* Sounds Settings Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 flex items-center space-x-2">
              <Volume2 size={18} className="text-brand-orange" />
              <span>Notification Sounds</span>
            </h3>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-sm font-semibold text-slate-700">Sound Alert for New Orders</span>
                <span className="text-xs text-slate-400 block">Play alert tune on order insertion</span>
              </div>
              <input
                type="checkbox"
                className="w-10 h-6 bg-slate-200 checked:bg-brand-orange rounded-full appearance-none relative before:content-[''] before:absolute before:w-5 before:h-5 before:bg-white before:rounded-full before:top-0.5 before:left-0.5 checked:before:left-4.5 before:transition-all cursor-pointer border border-slate-300"
                checked={settings.soundAlert}
                onChange={(e) => setSettings(prev => ({ ...prev, soundAlert: e.target.checked }))}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleThemeChange('quiet')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                  settings.soundTheme === 'quiet'
                    ? 'bg-brand-orange text-white border-brand-orange'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                Quiet / Relaxed
              </button>
              <button
                type="button"
                onClick={() => handleThemeChange('default')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                  settings.soundTheme === 'default'
                    ? 'bg-brand-orange text-white border-brand-orange'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                Default
              </button>
              <button
                type="button"
                onClick={() => handleThemeChange('noisy')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                  settings.soundTheme === 'noisy'
                    ? 'bg-brand-orange text-white border-brand-orange'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                Noisy / Busy
              </button>
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
                <span>Alert Volume</span>
                <span>{settings.soundVolume}%</span>
              </div>
              <div className="flex items-center space-x-4">
                <input
                  type="range"
                  min="0"
                  max="100"
                  className="w-full accent-brand-orange"
                  value={settings.soundVolume}
                  onChange={handleVolumeChange}
                />
                <button
                  type="button"
                  onClick={playAlertSound}
                  disabled={!settings.soundAlert}
                  className="p-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 rounded-xl transition-all"
                >
                  <Play size={16} fill="currentColor" />
                </button>
              </div>
            </div>
          </div>

          {/* QR Links & Templates Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 flex items-center space-x-2">
              <Printer size={18} className="text-brand-orange" />
              <span>QR Links & App Settings</span>
            </h3>

            <div className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Driver App Template (URL)
                </label>
                <input
                  type="text"
                  value={settings.driverAppTemplate || ''}
                  onChange={(e) => setSettings(prev => ({ ...prev, driverAppTemplate: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-orange text-slate-700 font-semibold"
                  placeholder="https://..."
                />
                <span className="text-[9px] text-slate-400 font-medium leading-relaxed block">
                  Wildcards: <code>{`{order_id}`}</code>, <code>{`{address}`}</code>, <code>{`{driver}`}</code>, <code>{`{time}`}</code>.
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Customer App Store Link (iOS)
                </label>
                <input
                  type="text"
                  value={settings.appStoreLink || ''}
                  onChange={(e) => setSettings(prev => ({ ...prev, appStoreLink: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-orange text-slate-700 font-semibold"
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Customer Google Play Link (Android)
                </label>
                <input
                  type="text"
                  value={settings.playStoreLink || ''}
                  onChange={(e) => setSettings(prev => ({ ...prev, playStoreLink: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-orange text-slate-700 font-semibold"
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Print layouts & customized receipts */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-6">
          <h3 className="font-bold text-slate-800 flex items-center space-x-2">
            <Printer size={18} className="text-brand-orange" />
            <span>Receipt Printing</span>
          </h3>

          {/* Amount of copies */}
          <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl">
            <div className="space-y-0.5">
              <span className="text-sm font-semibold text-slate-700">Receipts quantity</span>
              <span className="text-xs text-slate-400 block">Number of duplicate copies to print</span>
            </div>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={decrementCopies}
                className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center font-bold text-lg text-slate-600 hover:bg-slate-100"
              >
                -
              </button>
              <span className="font-bold text-slate-800 w-4 text-center">{settings.receiptCopies}</span>
              <button
                type="button"
                onClick={incrementCopies}
                className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center font-bold text-lg text-slate-600 hover:bg-slate-100"
              >
                +
              </button>
            </div>
          </div>

          {/* Customise layout toggles */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Customise Layout content</span>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(settings.customiseReceipt).map(([key, val]) => (
                <label key={key} className="flex items-center space-x-2 text-xs font-semibold text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={val}
                    onChange={() => handleToggleReceiptCustom(key)}
                    className="rounded border-slate-300 text-brand-orange focus:ring-brand-orange w-4 h-4"
                  />
                  <span className="capitalize">{key === 'itemIds' ? 'Menu/Item IDs' : key}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Large layout toggles */}
          <div className="space-y-3 pt-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Enlarge text elements</span>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(settings.enlargeReceiptText).map(([key, val]) => (
                <label key={key} className="flex items-center space-x-2 text-xs font-semibold text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={val}
                    onChange={() => handleToggleReceiptEnlarge(key)}
                    className="rounded border-slate-300 text-brand-orange focus:ring-brand-orange w-4 h-4"
                  />
                  <span className="capitalize">{key === 'orderNo' ? 'Order Number' : key}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Test Printing button */}
          <div className="pt-4 flex space-x-3">
            <button
              type="button"
              onClick={() => triggerTestPrint({ id: 'test', order_number: 'TEST-1234-99' })}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center space-x-2"
            >
              <Printer size={16} />
              <span>Print Test Receipt</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Panel: Delivery Drivers Management */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-bold text-slate-800 flex items-center space-x-2 text-base">
              <span>👥 Courier Accounts & Credentials</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Manage delivery driver profiles, passcode PINs, and contact information</p>
          </div>
          <span className="bg-slate-100 text-slate-600 font-bold px-2.5 py-1 rounded-full text-xs">
            {drivers.length} Drivers Active
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create Driver Form */}
          <form onSubmit={handleAddDriver} className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-150/85">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Add New Courier</span>
            
            {driverError && (
              <div className="p-2 bg-rose-50 text-rose-600 text-xs font-bold rounded-lg">{driverError}</div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Driver Name</label>
              <input
                type="text"
                required
                placeholder="e.g. John Doe"
                value={newDriverName}
                onChange={(e) => setNewDriverName(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-orange text-slate-700 font-semibold"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">PIN passcode (4 digits)</label>
              <input
                type="text"
                required
                maxLength="4"
                value={newDriverPin}
                onChange={(e) => setNewDriverPin(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-orange text-slate-700 font-semibold"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Phone Number</label>
              <input
                type="tel"
                placeholder="e.g. +31612345678"
                value={newDriverPhone}
                onChange={(e) => setNewDriverPhone(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-orange text-slate-700 font-semibold"
              />
            </div>

            <button
              type="submit"
              disabled={isAddingDriver}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-250 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              {isAddingDriver ? 'Adding Courier...' : 'Add Driver Account'}
            </button>
          </form>

          {/* Drivers list */}
          <div className="lg:col-span-2 overflow-x-auto border border-slate-100 rounded-2xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-55 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="p-3">Courier Name</th>
                  <th className="p-3">Login PIN</th>
                  <th className="p-3">Phone number</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {drivers.map(d => (
                  <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3 font-extrabold text-slate-800 flex items-center space-x-1.5">
                      <span>🛵</span>
                      <span>{d.name}</span>
                    </td>
                    <td className="p-3 font-mono font-bold text-brand-orange">{d.passcode}</td>
                    <td className="p-3 font-semibold text-slate-500">{d.phone || 'None'}</td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete driver account for ${d.name}?`)) {
                            deleteDriver(d.id);
                          }
                        }}
                        className="text-rose-500 hover:text-rose-600 font-bold hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {drivers.length === 0 && (
                  <tr>
                    <td colSpan="4" className="p-6 text-center text-slate-400 font-medium">
                      No courier profiles configured yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Footer controls */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={resetAll}
          className="flex items-center space-x-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold transition-all"
        >
          <RotateCcw size={14} />
          <span>Reset Configuration</span>
        </button>
        <button
          type="button"
          onClick={() => alert('Settings saved successfully!')}
          className="flex items-center space-x-1.5 px-5 py-2.5 bg-brand-orange hover:bg-opacity-95 text-white rounded-xl text-sm font-bold transition-all shadow-sm shadow-brand-orange/20"
        >
          <Save size={16} />
          <span>Save Changes</span>
        </button>
      </div>
    </div>
  );
}
