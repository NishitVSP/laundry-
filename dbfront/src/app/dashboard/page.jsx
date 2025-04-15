'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Dashboard() {
  const [auth, setAuth] = useState(null);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const checkAuth = async () => {
      try {
        const res = await fetch('http://localhost:4000/isAuth', {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Authentication failed');
          localStorage.clear();
          router.push('/login');
          return;
        }

        setAuth(data);
        localStorage.setItem('role', data.role);
        localStorage.setItem('username', data.username);
      } catch (err) {
        console.error('Error during auth:', err);
        setError('Something went wrong');
        localStorage.clear();
        router.push('/login');
      }
    };

    checkAuth();
  }, [router]);

  if (error) return <div className="p-10 text-red-600 font-semibold">Error: {error}</div>;
  if (!auth) return <div className="p-10 text-gray-600">Checking authentication...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Welcome, {auth.username}</h1>
        <p className="text-lg text-gray-600 mt-1">
          You are logged in as{' '}
          <span className="inline-block px-2 py-1 bg-gray-200 rounded text-sm font-medium">
            {auth.role}
          </span>
        </p>
      </div>

      <div>{auth.role === 'admin' ? <AdminDashboard /> : <UserDashboard />}</div>
    </div>
  );
}

// Admin Dashboard
function AdminDashboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');

    const fetchAllPortfolios = async () => {
      try {
        const res = await fetch('http://localhost:4000/protfolio/all', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await res.json();
        setData(result);
      } catch (err) {
        console.error('Failed to fetch admin data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllPortfolios();
  }, []);

  if (loading) return <p>Loading all portfolios...</p>;
  if (data.length === 0) return <p>No customer data found.</p>;

  const groupedData = data.reduce((acc, entry) => {
    const id = entry.customer_id;
    if (!acc[id]) {
      acc[id] = {
        customer_id: id,
        customer_name: entry.customer_name,
        orders: [],
      };
    }

    if (entry.order_id) {
      acc[id].orders.push({
        order_id: entry.order_id,
        order_status: entry.order_status,
        Total_Amount: entry.Total_Amount,
        Pickup_Date: entry.Pickup_Date,
        Delivery_Date: entry.Delivery_Date,
        items: entry.items,
        Payment_Mode: entry.Payment_Mode,
        Amount: entry.Amount,
        complaint_type: entry.complaint_type,
        complaint_status: entry.complaint_status,
      });
    }

    return acc;
  }, {});

  const customers = Object.values(groupedData);

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-semibold border-b pb-2">All Customers & Orders</h2>
      {customers.map((customer) => (
        <div key={customer.customer_id} className="bg-white rounded-xl border shadow p-6">
          <h3 className="text-xl font-bold mb-2">
            {customer.customer_name} <span className="text-gray-500">(ID: {customer.customer_id})</span>
          </h3>

          {customer.orders.length === 0 ? (
            <p className="text-gray-500 italic">No orders placed.</p>
          ) : (
            <div className="grid gap-4 mt-4">
              {customer.orders.map((order, index) => (
                <div key={index} className="border-t pt-4">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <p><strong>Order ID:</strong> {order.order_id}</p>
                    <p><strong>Status:</strong> <span className="text-blue-600">{order.order_status}</span></p>
                    <p><strong>Total:</strong> ₹{order.Total_Amount}</p>
                    <p><strong>Pickup:</strong> {new Date(order.Pickup_Date).toLocaleDateString()}</p>
                    <p><strong>Delivery:</strong> {order.Delivery_Date ? new Date(order.Delivery_Date).toLocaleDateString() : 'Not delivered yet'}</p>
                    <p><strong>Items:</strong> {order.items}</p>
                    <p><strong>Payment:</strong> {order.Payment_Mode || 'N/A'} - ₹{order.Amount || 'N/A'}</p>
                    {order.complaint_type && (
                      <p className="col-span-2 text-red-600">
                        <strong>Complaint:</strong> {order.complaint_type} ({order.complaint_status})
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// User Dashboard
function UserDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');

    const fetchPortfolio = async () => {
      try {
        const res = await fetch('http://localhost:4000/protfolio/me', {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        setOrders(data);
      } catch (error) {
        console.error('Failed to fetch user portfolio:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolio();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Your Orders</h2>
        <Link href="/dashboard/create" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
          + Place New Order
        </Link>
      </div>

      {loading ? (
        <p>Loading your orders...</p>
      ) : orders.length === 0 ? (
        <p className="text-gray-600 italic">No orders found.</p>
      ) : (
        orders.map((order, index) => (
          <div key={index} className="bg-white p-5 border rounded-xl shadow">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <p><strong>Order ID:</strong> {order.order_id}</p>
              <p><strong>Status:</strong> <span className="text-blue-600">{order.order_status}</span></p>
              <p><strong>Total:</strong> ₹{order.Total_Amount}</p>
              <p><strong>Pickup Date:</strong> {new Date(order.Pickup_Date).toLocaleDateString()}</p>
              <p><strong>Items:</strong> {order.items}</p>
              <p><strong>Payment:</strong> {order.Payment_Mode || 'N/A'} - ₹{order.Amount || 'N/A'}</p>
              {order.complaint_type && (
                <p className="col-span-2 text-red-600">
                  <strong>Complaint:</strong> {order.complaint_type} ({order.complaint_status})
                </p>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
