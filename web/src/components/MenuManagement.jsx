import React, { useState, useEffect } from 'react';
import { usePOS } from '../context/POSContext';
import { Store, ToggleLeft, ToggleRight, Search, Eye, EyeOff } from 'lucide-react';

export default function MenuManagement() {
  const { restaurantOpen, toggleRestaurantOpen, menuItems, toggleItemStock } = usePOS();
  const [activeCategory, setActiveCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Auto-select first category once menuItems are dynamically loaded
  useEffect(() => {
    if (!activeCategory && menuItems.length > 0) {
      setActiveCategory(menuItems[0].id);
    }
  }, [menuItems, activeCategory]);

  const filteredItems = menuItems.map(cat => {
    return {
      ...cat,
      items: cat.items.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    };
  });

  const selectedCategory = menuItems.find(c => c.id === activeCategory);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Menu & Storefront Control</h2>
          <p className="text-sm text-slate-500">Enable/disable storefront order intake and mark ingredients out of stock</p>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search menu items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 w-full md:w-64 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-orange text-sm"
          />
        </div>
      </div>

      {/* Hyperzod Store Open/Close Control Card */}
      <div className={`p-6 rounded-2xl border transition-all duration-300 flex flex-col md:flex-row items-center justify-between ${
        restaurantOpen 
          ? 'bg-emerald-50/50 border-emerald-100' 
          : 'bg-rose-50/50 border-rose-100'
      }`}>
        <div className="flex items-center space-x-4 mb-4 md:mb-0">
          <div className={`p-4 rounded-2xl ${restaurantOpen ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
            <Store size={28} />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-800">
              {restaurantOpen ? 'Storefront is Accepting Orders' : 'Storefront is Offline / Closed'}
            </h3>
            <p className="text-sm text-slate-500">
              {restaurantOpen 
                ? 'Customers can browse your menu and place new orders on the Hyperzod app.' 
                : 'Customers will see your kitchen as closed and will not be able to order.'
              }
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleRestaurantOpen}
          className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-bold transition-all shadow-sm ${
            restaurantOpen 
              ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200' 
              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200'
          }`}
        >
          {restaurantOpen ? 'Pause Store / Go Offline' : 'Resume Store / Go Online'}
        </button>
      </div>

      {/* Category selector / list grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        {/* Left Side: Categories column */}
        <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm space-y-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 py-2 block">Categories</span>
          {menuItems.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`w-full text-left px-3 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-between ${
                activeCategory === cat.id
                  ? 'bg-brand-light text-brand-orange'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>{cat.name}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                activeCategory === cat.id ? 'bg-brand-orange text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                {cat.items.length}
              </span>
            </button>
          ))}
        </div>

        {/* Right Side: Items stock toggles list */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm md:col-span-3 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
            <h4 className="font-bold text-slate-800">
              {searchQuery ? 'Search Results' : selectedCategory?.name}
            </h4>
            <span className="text-xs text-slate-400 font-semibold">Toggles sync instantly with customer app</span>
          </div>

          <div className="divide-y divide-slate-100">
            {/* If searching, render flat list of filtered items, else render active category items */}
            {searchQuery ? (
              filteredItems.flatMap(cat => 
                cat.items.map(item => (
                  <ItemRow key={item.id} categoryId={cat.id} item={item} onStockToggle={toggleItemStock} />
                ))
              )
            ) : (
              selectedCategory?.items.map(item => (
                <ItemRow key={item.id} categoryId={selectedCategory.id} item={item} onStockToggle={toggleItemStock} />
              ))
            )}

            {((searchQuery && filteredItems.every(c => c.items.length === 0)) || (!searchQuery && selectedCategory?.items.length === 0)) && (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <Search size={32} className="mx-auto text-slate-300" />
                <p className="font-semibold">No menu items found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Inner Component for Stock row
function ItemRow({ categoryId, item, onStockToggle }) {
  return (
    <div className={`p-4 flex items-center justify-between transition-all ${!item.inStock ? 'bg-slate-50/50' : ''}`}>
      <div className="space-y-1">
        <div className="flex items-center space-x-2">
          <span className={`font-semibold text-sm ${item.inStock ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
            {item.name}
          </span>
          {!item.inStock && (
            <span className="bg-red-50 text-red-600 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center space-x-1">
              <EyeOff size={10} />
              <span>Out of Stock</span>
            </span>
          )}
        </div>
        <span className="text-xs text-slate-500 font-semibold">€{item.price.toFixed(2)}</span>
      </div>

      <div className="flex items-center space-x-4">
        {/* Visibility Icon Status */}
        <span className={item.inStock ? 'text-emerald-500' : 'text-slate-300'}>
          {item.inStock ? <Eye size={18} /> : <EyeOff size={18} />}
        </span>

        {/* Toggle Switch */}
        <button
          type="button"
          onClick={() => onStockToggle(categoryId, item.id)}
          className={`w-12 h-7 rounded-full transition-all relative ${
            item.inStock ? 'bg-emerald-500' : 'bg-slate-300'
          }`}
        >
          <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all ${
            item.inStock ? 'left-6' : 'left-1'
          }`} />
        </button>
      </div>
    </div>
  );
}
