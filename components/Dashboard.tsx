
import React, { useMemo } from 'react';
import { InventoryItem, ItemCondition, BorrowRecord } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { getCategoryColor } from '../constants';
import { AlertTriangle, CheckCircle, AlertOctagon, Box, HandPlatter, Activity, Layers } from 'lucide-react';

interface DashboardProps {
  items: InventoryItem[];
  borrowRecords: BorrowRecord[];
}

const Dashboard: React.FC<DashboardProps> = ({ items, borrowRecords }) => {
  const stats = useMemo(() => {
    const totalItems = items.length;
    const totalQuantity = items.reduce((acc, item) => acc + item.quantity, 0);
    
    // Calculate Active Loans directly from the transaction list (Borrowed or Overdue)
    // This ensures that the dashboard always matches the records in the Lending tab.
    const activeBorrowedQuantity = borrowRecords
        .filter(r => r.status === 'Borrowed' || r.status === 'Overdue')
        .reduce((acc, rec) => acc + rec.quantity, 0);

    const availableQuantity = totalQuantity - activeBorrowedQuantity;
    
    const lowStockItems = items.filter(item => {
        // Use the transaction-based borrowed count for specific items to determine low stock
        const itemActiveBorrowed = borrowRecords
            .filter(r => r.itemId === item.id && (r.status === 'Borrowed' || r.status === 'Overdue'))
            .reduce((acc, r) => acc + r.quantity, 0);
        
        const limit = item.maxBorrowable ?? item.quantity;
        const availableInLab = (limit - itemActiveBorrowed);
        return availableInLab < 5 && limit > 0;
    }).length;
    
    const defectiveItems = items.filter(item => item.condition === ItemCondition.Condemned || item.condition === ItemCondition.Defective).length;

    // Category data
    const catCounts: Record<string, number> = {};
    items.forEach(item => {
      catCounts[item.category] = (catCounts[item.category] || 0) + item.quantity;
    });
    const valueByCategory = Object.entries(catCounts).map(([name, value]) => ({ name, value })).filter(x => x.value > 0);

    // Condition data
    const condCounts: Record<string, number> = {};
    Object.values(ItemCondition).forEach(c => condCounts[c] = 0);
    items.forEach(item => {
      condCounts[item.condition] = (condCounts[item.condition] || 0) + 1;
    });
    const conditionBreakdown = Object.entries(condCounts).map(([name, value]) => ({ name, value }));

    return { totalItems, totalQuantity, borrowedQuantity: activeBorrowedQuantity, availableQuantity, lowStockItems, defectiveItems, valueByCategory, conditionBreakdown };
  }, [items, borrowRecords]);

  const CardGlass = "bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 p-6 group cursor-default";

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className={CardGlass}>
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
              <Box className="w-6 h-6" />
            </div>
            <Activity className="w-4 h-4 text-gray-300" />
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Available Assets</p>
          <h3 className="text-3xl font-extrabold text-gray-800 mt-1">{stats.availableQuantity}</h3>
        </div>
        
        <div className={CardGlass}>
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
              <HandPlatter className="w-6 h-6" />
            </div>
            <Layers className="w-4 h-4 text-gray-300" />
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Loans</p>
          <h3 className="text-3xl font-extrabold text-gray-800 mt-1">{stats.borrowedQuantity}</h3>
        </div>

        <div className={CardGlass}>
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl group-hover:bg-amber-600 group-hover:text-white transition-colors duration-300">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Stock Alerts</p>
          <h3 className="text-3xl font-extrabold text-amber-600 mt-1">{stats.lowStockItems}</h3>
        </div>

        <div className={CardGlass}>
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-50 text-green-600 rounded-xl group-hover:bg-green-600 group-hover:text-white transition-colors duration-300">
              <CheckCircle className="w-6 h-6" />
            </div>
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Unique Items</p>
          <h3 className="text-3xl font-extrabold text-gray-800 mt-1">{stats.totalItems}</h3>
        </div>

        <div className={CardGlass}>
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-red-50 text-red-600 rounded-xl group-hover:bg-red-600 group-hover:text-white transition-colors duration-300">
              <AlertOctagon className="w-6 h-6" />
            </div>
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Defective</p>
          <h3 className="text-3xl font-extrabold text-red-600 mt-1">{stats.defectiveItems}</h3>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-bold text-gray-800">Domain Distribution</h3>
            <span className="text-xs font-medium text-gray-400 uppercase tracking-widest">Global Inventory</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.valueByCategory}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={105}
                  paddingAngle={8}
                  dataKey="value"
                  animationBegin={0}
                  animationDuration={1500}
                >
                  {stats.valueByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getCategoryColor(entry.name)} strokeWidth={0} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} 
                  itemStyle={{ fontWeight: 'bold' }}
                />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-bold text-gray-800">Equipment Health</h3>
            <span className="text-xs font-medium text-gray-400 uppercase tracking-widest">Maintenance Metrics</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.conditionBreakdown} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <RechartsTooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} 
                />
                <Bar 
                  dataKey="value" 
                  fill="#6366f1" 
                  radius={[6, 6, 0, 0]} 
                  barSize={40}
                  animationDuration={2000}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
