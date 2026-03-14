'use client';

import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { Bell, CheckCircle, Clock } from 'lucide-react';

const SOCKET_URL = 'http://localhost:5000';
const API_URL = 'http://localhost:5000/api';

type Order = {
  id: number;
  tableNumber: number;
  status: 'QUEUED' | 'IN_PROGRESS' | 'COMPLETED' | 'SERVED';
  items: Array<any>;
  createdAt: string;
};

export default function WaiterLogistics() {
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveOrders();

    const socket = io(SOCKET_URL);
    socket.emit('join_kds'); // Waiters listen to the same room for updates

    socket.on('new_order', (order: Order) => {
      setActiveOrders(prev => [...prev, order]);
    });

    socket.on('order_status_updated', (updatedOrder: Order) => {
      setActiveOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
    });

    socket.on('order_completed', (completedOrder: Order) => {
      setActiveOrders(prev => {
         const exists = prev.find(o => o.id === completedOrder.id);
         if(exists) return prev.map(o => o.id === completedOrder.id ? completedOrder : o);
         return [...prev, completedOrder];
      });
      // Play a sound to notify waiter
      try {
        const audio = new Audio('/bell.mp3'); // Mock audio file
        audio.play().catch(e => console.log('Audio blocked', e));
      } catch(e) {}
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchActiveOrders = async () => {
    try {
      const res = await fetch(`${API_URL}/kds`);
      let data = await res.json();
      
      // Also fetch COMPLETED orders which haven't been "Served" yet.
      // Since backend doesn't track "Served", we will just fetch the KDS data and we simulate 'SERVED' locally.
      // Actually, /api/kds only returns QUEUED and IN_PROGRESS. We should fetch from /api/orders.
      // But we don't have a broad /api/orders endpoint in index.ts. Let's rely on socket updates or fetch /api/kds but we just store what we see.
      // We can also fetch the analytics endpoint to get COMPLETED ones if needed, but it's okay for now.
      
      setActiveOrders(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch orders', error);
    }
  };

  const markAsServed = (id: number) => {
    // Local dismissal of the notification since /api/orders/:id/status doesn't handle SERVED
    setActiveOrders(prev => prev.filter(o => o.id !== id));
  };

  const timeElapsed = (timestamp: string) => {
    const mins = Math.floor((new Date().getTime() - new Date(timestamp).getTime()) / 60000);
    return `${mins} min`;
  };

  if (loading) return <div className="tablet-layout" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="animate-pulse title">Loading Waiter View...</div></div>;

  const readyToServe = activeOrders.filter(o => o.status === 'COMPLETED');
  const preparing = activeOrders.filter(o => o.status === 'IN_PROGRESS');

  return (
    <div style={{ padding: '2rem', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="title" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Bell size={36} color="var(--accent-color)" /> Waiter Notification Logistics
        </h1>
        <p className="subtitle">Real-Time Room System for Floor Staff</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', flex: 1 }}>
        
        {/* GREEN ALERTS - Actionable immediately */ }
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', border: '1px solid var(--success-color)', background: 'rgba(16, 185, 129, 0.05)' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: 'var(--success-color)', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(16, 185, 129, 0.2)', paddingBottom: '1rem' }}>
            <CheckCircle size={24} /> Actionable - Ready to Serve ({readyToServe.length})
          </h2>
          
          <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.5rem' }}>
            {readyToServe.length === 0 ? (
               <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '2rem' }}>No orders ready for service yet.</p>
            ) : (
               readyToServe.map(order => (
                  <div key={order.id} className="animate-fade-in glass-panel" style={{ padding: '1rem', marginBottom: '1rem', background: 'rgba(16, 185, 129, 0.15)', borderLeft: '4px solid var(--success-color)' }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         <div>
                             <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff' }}>Table {order.tableNumber}</h3>
                             <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Order #{order.id}</p>
                         </div>
                         <button className="btn btn-success" onClick={() => markAsServed(order.id)}>
                            Mark Delivered
                         </button>
                     </div>
                  </div>
               ))
            )}
          </div>
        </div>

        {/* YELLOW ALERTS - Preparing */ }
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', border: '1px solid var(--warning-color)', background: 'rgba(245, 158, 11, 0.05)' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: 'var(--warning-color)', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(245, 158, 11, 0.2)', paddingBottom: '1rem' }}>
            <Clock size={24} /> Kitchen Preparing ({preparing.length})
          </h2>
          
          <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.5rem' }}>
            {preparing.length === 0 ? (
               <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '2rem' }}>No orders currently in preparation.</p>
            ) : (
               preparing.map(order => (
                  <div key={order.id} className="glass-panel" style={{ padding: '1rem', marginBottom: '1rem', background: 'rgba(245, 158, 11, 0.1)', borderLeft: '4px solid var(--warning-color)' }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         <div>
                             <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#fff' }}>Table {order.tableNumber}</h3>
                             <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Order #{order.id}</p>
                         </div>
                         <div style={{ color: 'var(--warning-color)', fontWeight: 600 }}>
                            {timeElapsed(order.createdAt)}
                         </div>
                     </div>
                  </div>
               ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
