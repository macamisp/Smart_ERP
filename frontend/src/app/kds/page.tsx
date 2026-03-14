'use client';

import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { ChefHat, CheckSquare, Clock, AlertTriangle, Play, CheckCircle2 } from 'lucide-react';

const SOCKET_URL = 'http://localhost:5000';
const API_URL = 'http://localhost:5000/api';

type OrderItem = {
  id: number;
  menuItem: {
    name: string;
    size: string;
    prepTimeMins: number;
  };
  quantity: number;
  status: string;
};

type Order = {
  id: number;
  tableNumber: number;
  status: 'QUEUED' | 'IN_PROGRESS' | 'COMPLETED';
  items: OrderItem[];
  createdAt: string;
};

export default function KDS() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchKDS();

    const socket = io(SOCKET_URL);
    socket.emit('join_kds');

    socket.on('new_order', (order: Order) => {
      setOrders(prev => [...prev, order]);
    });

    socket.on('order_status_updated', (updatedOrder: Order) => {
      setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
    });

    socket.on('order_completed', (completedOrder: Order) => {
      // Remove it from active orders screen
      setOrders(prev => prev.filter(o => o.id !== completedOrder.id));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchKDS = async () => {
    try {
      const res = await fetch(`${API_URL}/kds`);
      const data = await res.json();
      setOrders(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch KDS feed', error);
    }
  };

  const updateOrderStatus = async (id: number, status: 'IN_PROGRESS' | 'COMPLETED') => {
    try {
      await fetch(`${API_URL}/orders/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (status === 'COMPLETED') {
        setOrders(prev => prev.filter(o => o.id !== id));
      }
    } catch (error) {
      console.error('Failed to update status', error);
    }
  };

  const timeElapsed = (timestamp: string) => {
    const mins = Math.floor((new Date().getTime() - new Date(timestamp).getTime()) / 60000);
    return `${mins}m ago`;
  };

  const activeCount = orders.filter(o => o.status === 'IN_PROGRESS').length;

  if (loading) return <div className="tablet-layout" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="animate-pulse title">Loading KDS...</div></div>;

  return (
    <div style={{ padding: '2rem', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="title" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <ChefHat size={36} color="var(--accent-color)" /> Kitchen Display System (KDS)
          </h1>
          <p className="subtitle">Real-Time Order Queue & Preparation Tracking</p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          {activeCount >= 5 && (
             <div className="glass-panel" style={{ padding: '0.5rem 1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'rgba(239, 68, 68, 0.2)', color: 'var(--danger-color)', border: '1px solid var(--danger-color)' }}>
               <AlertTriangle size={18} /> High Load (Manager Notified)
             </div>
          )}
          <div className="glass-panel" style={{ padding: '0.5rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{activeCount}</span>
            <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>ACTIVE PAN</span>
          </div>
          <div className="glass-panel" style={{ padding: '0.5rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{orders.filter(o => o.status === 'QUEUED').length}</span>
            <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>QUEUED</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem', overflowY: 'auto', flex: 1, paddingRight: '1rem' }}>
        {orders.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', marginTop: '10vh', color: 'var(--text-secondary)' }}>
            <CheckCircle2 size={64} opacity={0.3} style={{ margin: '0 auto 1rem' }} />
            <h2 style={{ fontSize: '1.5rem' }}>No Active Orders</h2>
            <p>Kitchen is clear. Waiting for new orders from tablets.</p>
          </div>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="glass-panel animate-fade-in" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', borderTop: order.status === 'QUEUED' ? '4px solid var(--warning-color)' : '4px solid var(--accent-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>Order #{order.id}</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Table {order.tableNumber}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                   <Clock size={16} color="var(--text-secondary)"/> <span style={{ color: 'var(--text-secondary)' }}>{timeElapsed(order.createdAt)}</span>
                </div>
              </div>

              <div style={{ flex: 1, marginBottom: '1.5rem' }}>
                {order.items.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px dashed rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                       <span style={{ fontWeight: 'bold', color: 'var(--accent-color)' }}>{item.quantity}x</span>
                       <span>{item.menuItem.name} <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>({item.menuItem.size})</span></span>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: 'auto' }}>
                {order.status === 'QUEUED' ? (
                  <button className="btn btn-primary w-full" onClick={() => updateOrderStatus(order.id, 'IN_PROGRESS')} style={{ padding: '1rem' }}>
                    <Play size={18} /> Start Preparing
                  </button>
                ) : (
                  <button className="btn btn-success w-full" onClick={() => updateOrderStatus(order.id, 'COMPLETED')} style={{ padding: '1rem' }}>
                    <CheckSquare size={18} /> Complete (Deduct BOM)
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
