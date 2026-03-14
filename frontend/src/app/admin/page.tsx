'use client';

import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { BarChart3, AlertTriangle, Package, DollarSign, Trash2, ArrowUpRight, TrendingUp } from 'lucide-react';

const SOCKET_URL = 'http://localhost:5000';
const API_URL = 'http://localhost:5000/api';

type Ingredient = {
  id: number;
  name: string;
  unit: string;
  currentStock: number;
  minimumReorder: number;
  unitCost: number;
};

type Alert = {
  type: string;
  message: string;
};

type Financials = {
  revenue: number;
  foodCost: number;
  grossMargin: number;
  marginPercentage: string;
};

export default function AdminDashboard() {
  const [inventory, setInventory] = useState<Ingredient[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [financials, setFinancials] = useState<Financials>({ revenue: 0, foodCost: 0, grossMargin: 0, marginPercentage: '0%' });
  const [loading, setLoading] = useState(true);

  // Waste logging form state
  const [selectedIngredient, setSelectedIngredient] = useState('');
  const [wasteQty, setWasteQty] = useState('');
  const [wasteReason, setWasteReason] = useState('Spillage');

  useEffect(() => {
    fetchData();

    const socket = io(SOCKET_URL);
    
    socket.on('dashboard_update', () => {
      fetchData();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchData = async () => {
    try {
      const [invRes, finRes] = await Promise.all([
        fetch(`${API_URL}/inventory`),
        fetch(`${API_URL}/analytics/financials`)
      ]);
      const invData = await invRes.json();
      const finData = await finRes.json();

      setInventory(invData.inventory);
      setAlerts(invData.alerts);
      setFinancials(finData);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch admin data', error);
    }
  };

  const handleWasteLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIngredient || !wasteQty) return;

    try {
      await fetch(`${API_URL}/inventory/waste`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredientId: parseInt(selectedIngredient),
          quantity: parseFloat(wasteQty),
          reason: wasteReason,
          loggedBy: 1 // Mock Manager ID
        })
      });
      setWasteQty('');
      fetchData(); // Refresh UI
    } catch (error) {
      console.error('Failed to log waste', error);
    }
  };

  const getStockColor = (current: number, min: number) => {
    if (current <= 0) return 'var(--danger-color)';
    if (current <= min) return 'var(--warning-color)';
    return 'var(--success-color)';
  };

  if (loading) return <div className="tablet-layout" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="animate-pulse title">Loading Dashboard...</div></div>;

  return (
    <div style={{ padding: '2rem', height: '100vh', overflowY: 'auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="title" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <BarChart3 size={36} color="var(--accent-color)" /> Admin Financial & Inventory Dashboard
        </h1>
        <p className="subtitle">Real-Time Costing, Margins & Raw Material Availability</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid #10b981' }}>
           <h3 style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}><DollarSign size={16}/> Total Revenue</h3>
           <h2 style={{ fontSize: '2rem', marginTop: '0.5rem' }}>Rs.{financials.revenue.toFixed(2)}</h2>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid #ef4444' }}>
           <h3 style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}><Package size={16}/> True BOM Cost</h3>
           <h2 style={{ fontSize: '2rem', marginTop: '0.5rem' }}>Rs.{financials.foodCost.toFixed(2)}</h2>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid #3b82f6' }}>
           <h3 style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}><TrendingUp size={16}/> Gross Margin</h3>
           <h2 style={{ fontSize: '2rem', marginTop: '0.5rem' }}>Rs.{financials.grossMargin.toFixed(2)}</h2>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid #f59e0b' }}>
           <h3 style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}><ArrowUpRight size={16}/> Margin %</h3>
           <h2 style={{ fontSize: '2rem', marginTop: '0.5rem' }}>{financials.marginPercentage}</h2>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        {/* Inventory Report */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>Real-Time Inventory Levels</h2>
          
          {alerts.length > 0 && (
             <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger-color)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                <h4 style={{ color: 'var(--danger-color)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}><AlertTriangle size={16}/> Low Stock Alerts</h4>
                <ul style={{ paddingLeft: '1.5rem', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                   {alerts.map((alert, i) => <li key={i}>{alert.message}</li>)}
                </ul>
             </div>
          )}

          <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', borderBottom: '1px dashed rgba(255,255,255,0.1)' }}>
                  <th style={{ padding: '0.5rem' }}>Ingredient</th>
                  <th style={{ padding: '0.5rem' }}>Current Stock</th>
                  <th style={{ padding: '0.5rem' }}>Min. Reorder</th>
                  <th style={{ padding: '0.5rem' }}>Unit Cost</th>
                  <th style={{ padding: '0.5rem' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px dashed rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>{item.name}</td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>{item.currentStock} {item.unit}</td>
                    <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>{item.minimumReorder} {item.unit}</td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>Rs.{item.unitCost}</td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: getStockColor(item.currentStock, item.minimumReorder) }}></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Waste Log Form */}
        <div className="glass-panel" style={{ padding: '1.5rem', height: 'fit-content' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
            <Trash2 size={20} color="var(--warning-color)"/> Log Waste / Spillage
          </h2>
          <form onSubmit={handleWasteLog} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Select Ingredient</label>
              <select 
                 value={selectedIngredient} 
                 onChange={e => setSelectedIngredient(e.target.value)}
                 style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }}
                 required
              >
                <option value="" disabled style={{ color: 'black' }}>-- Select --</option>
                {inventory.map(item => (
                  <option key={item.id} value={item.id} style={{ color: 'black' }}>{item.name} ({item.unit})</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Quantity</label>
              <input 
                type="number" 
                step="0.01"
                min="0.01"
                value={wasteQty}
                onChange={e => setWasteQty(e.target.value)}
                placeholder="0.00"
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Reason</label>
              <select 
                 value={wasteReason}
                 onChange={e => setWasteReason(e.target.value)}
                 style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white' }}
              >
                <option value="Spillage" style={{ color: 'black' }}>Spillage</option>
                <option value="Burnt" style={{ color: 'black' }}>Burnt</option>
                <option value="Spoiled" style={{ color: 'black' }}>Spoiled</option>
                <option value="Customer Return" style={{ color: 'black' }}>Customer Return</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
              Deduct from Inventory
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
