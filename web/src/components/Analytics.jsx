import React, { useMemo } from 'react';
import { usePOS } from '../context/POSContext';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts';
import { DollarSign, ShoppingBag, TrendingUp, AlertTriangle, ArrowUpRight } from 'lucide-react';

const COLORS = ['#D8581B', '#3B82F6', '#10B981', '#F59E0B'];

export default function Analytics() {
  const { orders, menuItems } = usePOS();

  // Compute stats based on current orders list
  const stats = useMemo(() => {
    const completedOrders = orders.filter(o => {
      const status = (o.status || '').toLowerCase();
      return status === 'completed';
    });
    const totalSales = completedOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const orderCount = completedOrders.length;
    const avgTicket = orderCount > 0 ? (totalSales / orderCount) : 0;

    // Count out-of-stock items
    let outOfStockCount = 0;
    menuItems.forEach(cat => {
      cat.items.forEach(item => {
        if (!item.inStock) outOfStockCount++;
      });
    });

    return { totalSales, orderCount, avgTicket, outOfStockCount };
  }, [orders, menuItems]);

  const salesChartData = useMemo(() => {
    const hours = Array.from({ length: 12 }, (_, i) => {
      const hour = 9 + i; // 09:00 to 20:00
      return {
        name: `${hour}:00`,
        Sales: 0,
        Orders: 0
      };
    });

    orders.forEach(order => {
      const status = (order.status || '').toLowerCase();
      const isCompleted = status === 'completed';
      if (!isCompleted) return;

      const date = new Date(order.created_at);
      const hour = date.getHours();
      
      if (hour >= 9 && hour <= 20) {
        const idx = hour - 9;
        hours[idx].Sales += Number(order.total || 0);
        hours[idx].Orders += 1;
      }
    });

    return hours;
  }, [orders]);

  const orderTypeData = useMemo(() => {
    const types = { delivery: 0, pickup: 0, dine_in: 0 };
    orders.forEach(o => {
      const type = (o.type || 'dine_in').toLowerCase();
      if (types[type] !== undefined) {
        types[type]++;
      }
    });

    const total = Object.values(types).reduce((a, b) => a + b, 0);
    if (total === 0) {
      return [];
    }

    return [
      { name: 'Delivery', value: types.delivery },
      { name: 'Pickup', value: types.pickup },
      { name: 'Dine-In', value: types.dine_in }
    ].filter(t => t.value > 0);
  }, [orders]);

  const categorySalesData = useMemo(() => {
    const cats = {};
    orders.forEach(o => {
      let items = [];
      if (Array.isArray(o.items)) {
        items = o.items;
      } else if (typeof o.items === 'string') {
        try {
          items = JSON.parse(o.items || '[]');
        } catch (e) {
          console.error("Failed to parse items in Analytics:", e);
        }
      }
      items.forEach(item => {
        // Find category
        let categoryName = 'Other';
        menuItems.forEach(c => {
          if (c.items.some(i => i.name === item.name)) {
            categoryName = c.name;
          }
        });
        cats[categoryName] = (cats[categoryName] || 0) + (item.quantity || 1);
      });
    });

    const entries = Object.entries(cats).map(([name, value]) => ({ name, value }));
    return entries.sort((a, b) => b.value - a.value);
  }, [orders, menuItems]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Business Analytics</h2>
          <p className="text-sm text-slate-500">POS Sales velocity and performance indicators</p>
        </div>
        <div className="flex items-center space-x-2 text-xs bg-brand-light text-brand-orange px-3 py-1.5 rounded-full font-semibold">
          <TrendingUp size={14} />
          <span>Real-time Sync Active</span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-brand-light text-brand-orange rounded-xl">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Today's Revenue</p>
            <h3 className="text-xl font-bold text-slate-800">
              €{stats.totalSales.toFixed(2)}
            </h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <ShoppingBag size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Completed Orders</p>
            <h3 className="text-xl font-bold text-slate-800">
              {stats.orderCount}
            </h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Average Check</p>
            <h3 className="text-xl font-bold text-slate-800">
              €{stats.avgTicket.toFixed(2)}
            </h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Out of Stock items</p>
            <h3 className={`text-xl font-bold ${stats.outOfStockCount > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
              {stats.outOfStockCount}
            </h3>
          </div>
        </div>
      </div>

      {/* Main Charts area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Curve Area Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-slate-800">Sales Velocity (Today)</h4>
            <span className="text-xs text-slate-400">09:00 - 21:00 (Hourly)</span>
          </div>
          <div className="h-64 flex items-center justify-center">
            {stats.orderCount === 0 ? (
              <div className="text-center text-slate-400 space-y-1">
                <TrendingUp size={28} className="mx-auto text-slate-300" />
                <p className="text-xs font-semibold">No sales recorded yet today</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesChartData}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D8581B" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#D8581B" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `€${v}`} />
                  <Tooltip formatter={(value) => [`€${value.toFixed(2)}`, 'Sales']} />
                  <Area type="monotone" dataKey="Sales" stroke="#D8581B" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSales)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Order Types Pie Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <h4 className="font-bold text-slate-800 mb-4">Fulfillment Ratios</h4>
          <div className="h-64 flex flex-col justify-between">
            <div className="h-48 relative flex items-center justify-center">
              {orderTypeData.length === 0 ? (
                <div className="text-center text-slate-400 space-y-1">
                  <ShoppingBag size={28} className="mx-auto text-slate-300" />
                  <p className="text-xs font-semibold">No orders recorded yet</p>
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={orderTypeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {orderTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                    <span className="text-xs text-slate-400 font-semibold block uppercase">Total</span>
                    <span className="text-2xl font-bold text-slate-700">
                      {orders.length}
                    </span>
                  </div>
                </>
              )}
            </div>
            {orderTypeData.length > 0 && (
              <div className="flex justify-around text-xs font-semibold text-slate-500">
                {orderTypeData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center space-x-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span>{entry.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Categories Bar Chart */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <h4 className="font-bold text-slate-800 mb-4">Top Selling Categories</h4>
        <div className="h-64 flex items-center justify-center">
          {categorySalesData.length === 0 ? (
            <div className="text-center text-slate-400 space-y-1">
              <ShoppingBag size={28} className="mx-auto text-slate-300" />
              <p className="text-xs font-semibold">No category sales recorded yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categorySalesData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip formatter={(value) => [value, 'Items Sold']} />
                <Bar dataKey="value" fill="#D8581B" radius={[8, 8, 0, 0]}>
                  {categorySalesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
