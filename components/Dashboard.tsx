import React, { useMemo } from 'react';
import { InventoryItem, ItemCondition, Category } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { getCategoryColor } from '../constants';
import { AlertTriangle, CheckCircle, AlertOctagon, Box, HandPlatter } from 'lucide-react';

interface DashboardProps {
  items: InventoryItem[];
}

const Dashboard: React.FC<DashboardProps> = ({ items }) => {
  const stats = useMemo(() => {
    const totalItems = items.length;
    const totalQuantity = items.reduce((acc, item) => acc + item.quantity, 0);
    const borrowedQuantity = items.reduce((acc, item) => acc + (item.borrowedQuantity || 0), 0);
    const availableQuantity = totalQuantity - borrowedQuantity;
    
    // Low stock: if available quantity is less than 5
    const lowStockItems = items.filter(item => (item.quantity - (item.borrowedQuantity || 0)) < 5).length;
    const condemnedItems = items.filter(item => item.condition === ItemCondition.Condemned || item.condition === ItemCondition.Defective).length;

    // Category data for Pie Chart
    const catCounts: Record<string, number> = {};
    items.forEach(item => {
      catCounts[item.category] = (catCounts[item.category] || 0) + item.quantity;
    });
    const valueByCategory = Object.entries(catCounts).map(([name, value]) => ({ name, value })).filter(x => x.value > 0);

    // Condition data for Bar Chart
    const condCounts: Record<string, number> = {};
    Object.values(ItemCondition).forEach(c => condCounts[c] = 0);
    items.forEach(item => {
      condCounts[item.condition] = (condCounts[item.condition] || 0) + 1;
    });
    const conditionBreakdown = Object.entries(condCounts).map(([name, value]) => ({ name, value }));

    return { totalItems, totalQuantity, borrowedQuantity, availableQuantity, lowStockItems, condemnedItems, valueByCategory, conditionBreakdown };
  }, [items]);

  // Updated to be fully opaque or very slight transparency for contrast against dark background
  const CardGlass = "bg-white rounded-xl border border-gray-200 shadow-lg";

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className={`${CardGlass} p-6 flex items-center space-x-4`}>
          <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
            <Box className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-600 font-medium">Available Stock</p>
            <h3 className="text-2xl font-bold text-gray-800">{stats.availableQuantity}</h3>
          </div>
        </div>
        
        <div className={`${CardGlass} p-6 flex items-center space-x-4`}>
          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-full">
            <HandPlatter className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-600 font-medium">Items on Loan</p>
            <h3 className="text-2xl font-bold text-gray-800">{stats.borrowedQuantity}</h3>
          </div>
        </div>

        <div className={`${CardGlass} p-6 flex items-center space-x-4`}>
          <div className="p-3 bg-maroon-100 text-maroon-600 rounded-full">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-600 font-medium">Low Stock Alerts</p>
            <h3 className="text-2xl font-bold text-gray-800">{stats.lowStockItems}</h3>
          </div>
        </div>

        <div className={`${CardGlass} p-6 flex items-center space-x-4`}>
          <div className="p-3 bg-green-100 text-green-600 rounded-full">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-600 font-medium">Unique Items</p>
            <h3 className="text-2xl font-bold text-gray-800">{stats.totalItems}</h3>
          </div>
        </div>

        <div className={`${CardGlass} p-6 flex items-center space-x-4`}>
          <div className="p-3 bg-maroon-100 text-maroon-600 rounded-full">
            <AlertOctagon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-600 font-medium">Defective</p>
            <h3 className="text-2xl font-bold text-gray-800">{stats.condemnedItems}</h3>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`${CardGlass} p-6`}>
          <h3 className="text-lg font-bold text-gray-800 mb-4">Inventory by Domain</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.valueByCategory}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.valueByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getCategoryColor(entry.name)} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`${CardGlass} p-6`}>
          <h3 className="text-lg font-bold text-gray-800 mb-4">Equipment Condition</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.conditionBreakdown}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{fontSize: 12}} stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <RechartsTooltip contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="value" fill="#4b5563" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;