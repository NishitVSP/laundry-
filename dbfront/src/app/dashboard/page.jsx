'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default function Dashboard() {
  const [auth, setAuth] = useState(null);
  const [profile, setProfile] = useState(null);
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
        
        // After authentication succeeds, fetch profile
        fetchProfile(token);
      } catch (err) {
        console.error('Error during auth:', err);
        setError('Something went wrong');
        localStorage.clear();
        router.push('/login');
      }
    };
    
    const fetchProfile = async (token) => {
      try {
        const profileRes = await fetch('http://localhost:4000/profile/getProfile', {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          console.log('Profile data:', profileData);
          setProfile(profileData);
        } else {
          console.error('Failed to fetch profile');
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      }
    };

    checkAuth();
  }, [router]);

  if (error) return <div className="p-10 text-red-600 font-semibold">Error: {error}</div>;
  if (!auth) return <div className="p-10 text-gray-600">Checking authentication...</div>;

  // Helper function to get profile image URL
  const getProfileImageUrl = () => {
    // Check if profile exists first
    if (!profile) {
      return null;
    }
    
    // Then check role
    if (profile.role === 'admin') {
      return profile.staff_image || null;
    } else {
      return profile.customer_image || null;
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="text-3xl font-bold bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md select-none">
            <span className="mr-1">Fresh</span>
            <span className="text-blue-200">Wash</span>
            <span className="text-xs ml-1 align-top">™</span>
          </div>
        </div>
        
        <div className="flex items-center">
          <div className="text-right mr-4">
            <p className="text-lg font-semibold">Welcome</p>
            <p className="text-sm text-gray-600">
              <span className="inline-block px-2 py-1 bg-gray-200 rounded text-xs font-medium">
                {auth.role}
              </span>
            </p>
          </div>
          <div className="flex flex-col items-end">
            <Link href="/dashboard/profile">
              <div className="h-12 w-12 rounded-full bg-blue-500 flex items-center justify-center overflow-hidden border-2 border-white shadow-md hover:border-blue-300 cursor-pointer transition-all">
                {profile && getProfileImageUrl() ? (
                  <img 
                    src={getProfileImageUrl()} 
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-blue-600 flex flex-col items-center justify-center text-white text-xs font-medium p-1">
                    <span>Fresh</span>
                    <span>Wash</span>
                    <span className="text-[7px]">User</span>
                  </div>
                )}
              </div>
            </Link>
            <button 
              onClick={() => {
                localStorage.clear(); // Clear all localStorage items
                router.push('/login');
              }}
              className="text-xs bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 px-3 py-1.5 rounded-md shadow-sm border border-red-200 font-medium flex items-center justify-center mt-2 transition-colors w-full"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-3 mb-6">
        <Link href="/dashboard" className="px-4 py-2 bg-blue-600 text-white rounded">
          Dashboard
        </Link>
        <Link href="/dashboard/complaints" className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded">
          Complaints
        </Link>
        <Link href="/dashboard/payments" className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded">
          Payments
        </Link>
        {auth.role === 'admin' && (
          <Link href="/dashboard/admin-query" className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded">
            SQL Query
          </Link>
        )}
      </div>

      <div>{auth.role === 'admin' ? <AdminDashboard /> : <UserDashboard />}</div>
    </div>
  );
}

// Admin Dashboard
function AdminDashboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('orders');
  const [complaints, setComplaints] = useState([]);
  const [loadingComplaints, setLoadingComplaints] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');

    const fetchAllPortfolios = async () => {
      try {
        const res = await fetch('http://localhost:4000/protfolio/all', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await res.json();
        console.log('Portfolio data:', result);
        setData(result);
      } catch (err) {
        console.error('Failed to fetch admin data:', err);
      } finally {
        setLoading(false);
      }
    };

    const fetchAllComplaints = async () => {
      setLoadingComplaints(true);
      try {
        const res = await fetch('http://localhost:4000/getComplaints', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await res.json();
        setComplaints(result);
      } catch (err) {
        console.error('Failed to fetch complaints:', err);
      } finally {
        setLoadingComplaints(false);
      }
    };

    fetchAllPortfolios();
    fetchAllComplaints();
  }, []);

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    const token = localStorage.getItem('token');
    setStatusUpdating(true);
    
    try {
      const res = await fetch(`http://localhost:4000/order/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (res.ok) {
        // Update local state to reflect the change
        setData(prevData => {
          const updatedData = [...prevData];
          updatedData.forEach(entry => {
            if (entry.order_id === orderId) {
              entry.order_status = newStatus;
              if (newStatus === 'Delivered') {
                entry.Delivery_Date = new Date().toISOString();
              }
            }
          });
          return updatedData;
        });
        alert(`Order ${orderId} status updated to ${newStatus}`);
      } else {
        const errorData = await res.json();
        alert(`Error: ${errorData.error || 'Something went wrong'}`);
      }
    } catch (err) {
      console.error('Error updating order status:', err);
      alert('Failed to update order status');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleUpdateComplaintStatus = async (complaintId, newStatus) => {
    const token = localStorage.getItem('token');
    
    try {
      const res = await fetch(`http://localhost:4000/${complaintId}/complaintstatus`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (res.ok) {
        // Update local state
        setComplaints(prevComplaints => 
          prevComplaints.map(complaint => 
            complaint.complaint_id === complaintId 
              ? {...complaint, complaint_status: newStatus} 
              : complaint
          )
        );
        alert(`Complaint status updated to ${newStatus}`);
      } else {
        const errorData = await res.json();
        alert(`Error: ${errorData.error || 'Something went wrong'}`);
      }
    } catch (err) {
      console.error('Error updating complaint status:', err);
      alert('Failed to update complaint status');
    }
  };

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

  // Sort orders in descending order (newest first) for each customer
  const customers = Object.values(groupedData).map(customer => {
    return {
      ...customer,
      orders: customer.orders.sort((a, b) => b.order_id - a.order_id)
    };
  });

  return (
    <div className="space-y-8">
      <div className="flex border-b">
        <button 
          className={`px-4 py-2 ${activeTab === 'orders' ? 'border-b-2 border-blue-500 font-semibold' : 'text-gray-500'}`}
          onClick={() => setActiveTab('orders')}
        >
          Customer Orders
        </button>
        <button 
          className={`px-4 py-2 ${activeTab === 'complaints' ? 'border-b-2 border-blue-500 font-semibold' : 'text-gray-500'}`}
          onClick={() => setActiveTab('complaints')}
        >
          Complaints
        </button>
      </div>

      {activeTab === 'orders' ? (
        <div>
          <h2 className="text-2xl font-semibold pb-2">All Customers & Orders</h2>
          {customers.map((customer) => (
            <div key={customer.customer_id} className="bg-white rounded-xl border shadow p-6 mb-4">
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
                        <p><strong>Order ID:</strong> 
                          <Link href={`/dashboard/order/${order.order_id}`} className="text-blue-600 hover:underline ml-1">
                            {order.order_id}
                          </Link>
                        </p>
                        <div className="flex items-center">
                          <strong>Status:</strong> 
                          <span className={`inline-flex items-center ml-2 ${
                            order.order_status === 'Delivered' ? 'text-green-600' : 
                            order.order_status === 'Picked up' ? 'text-blue-600' : 'text-yellow-600'
                          }`}>
                            {order.order_status}
                          </span>
                          <div className="ml-2">
                            <select 
                              className="border rounded p-1 text-sm"
                              onChange={(e) => handleUpdateOrderStatus(order.order_id, e.target.value)}
                              disabled={statusUpdating}
                              defaultValue=""
                            >
                              <option value="" disabled>Update</option>
                              <option value="Pending">Pending</option>
                              <option value="Picked up">Picked up</option>
                              <option value="Delivered">Delivered</option>
                            </select>
                          </div>
                        </div>
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
      ) : (
        <div>
          <h2 className="text-2xl font-semibold pb-2">All Complaints</h2>
          {loadingComplaints ? (
            <p>Loading complaints...</p>
          ) : complaints.length === 0 ? (
            <p className="text-gray-500 italic">No complaints found.</p>
          ) : (
            <div className="grid gap-4">
              {complaints.map((complaint) => (
                <div key={complaint.complaint_id} className="bg-white rounded-xl border shadow p-6">
                  <div className="grid grid-cols-2 gap-4">
                    <p><strong>Complaint ID:</strong> {complaint.complaint_id}</p>
                    <p><strong>Order ID:</strong> {complaint.order_id}</p>
                    <p><strong>Type:</strong> {complaint.complaint_type}</p>
                    <p><strong>Status:</strong> 
                      <span className={`ml-2 ${
                        complaint.complaint_status === 'Resolved' ? 'text-green-600' : 
                        complaint.complaint_status === 'In Progress' ? 'text-blue-600' : 'text-yellow-600'
                      }`}>
                        {complaint.complaint_status}
                      </span>
                    </p>
                    <p className="col-span-2"><strong>Details:</strong> {complaint.complaint_details}</p>
                    <div className="col-span-2 mt-2 flex gap-2">
                      <select 
                        className="border rounded p-1"
                        onChange={(e) => handleUpdateComplaintStatus(complaint.complaint_id, e.target.value)}
                        defaultValue=""
                      >
                        <option value="" disabled>Update Status</option>
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// User Dashboard
function UserDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentData, setPaymentData] = useState({
    order_id: '',
    payment_mode: 'Credit Card',
    date: new Date().toISOString().split('T')[0]
  });
  const [complaintData, setComplaintData] = useState({
    order_id: '',
    complaint_type: 'Damaged',
    complaint_details: ''
  });
  const [processingPayment, setProcessingPayment] = useState(false);
  const [processingComplaint, setProcessingComplaint] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showComplaintModal, setShowComplaintModal] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');

    const fetchPortfolio = async () => {
      try {
        const res = await fetch('http://localhost:4000/protfolio/me', {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        // Sort orders in descending order by order_id (newest first)
        const sortedOrders = data.sort((a, b) => b.order_id - a.order_id);
        setOrders(sortedOrders);
      } catch (error) {
        console.error('Failed to fetch user portfolio:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolio();
  }, []);

  const handlePayment = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    setProcessingPayment(true);

    try {
      const res = await fetch('http://localhost:4000/payment/make', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(paymentData)
      });

      const data = await res.json();

      if (res.ok) {
        alert('Payment successful!');
        setShowPaymentModal(false);
        
        // Update the order in the UI to reflect payment
        setOrders(orders.map(order => 
          order.order_id === Number(paymentData.order_id) 
            ? {...order, Payment_Mode: paymentData.payment_mode, Amount: order.Total_Amount} 
            : order
        ));
      } else {
        alert(`Payment failed: ${data.error}`);
      }
    } catch (err) {
      console.error('Payment error:', err);
      alert('Something went wrong with the payment');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleFileComplaint = async (e) => {
    e.preventDefault();
    console.log("Form submitted - handleFileComplaint triggered");
    
    const token = localStorage.getItem('token');
    if (!token) {
      console.error("No authentication token found");
      alert("You need to be logged in to submit a complaint. Please log in again.");
      router.push('/login');
      return;
    }
    
    if (!complaintData.order_id || !complaintData.complaint_type || !complaintData.complaint_details) {
      console.error("Missing required complaint data", complaintData);
      alert("Please fill in all required fields");
      return;
    }
    
    setProcessingComplaint(true);
    
    // Log the data being sent for debugging
    console.log('Submitting complaint data:', complaintData);
    console.log('Using token:', token ? `${token.substring(0, 10)}...` : 'No token');

    try {
      // First test server connectivity
      try {
        console.log("Testing server connectivity...");
        const testRes = await fetch('http://localhost:4000/debug');
        if (!testRes.ok) {
          throw new Error(`Server returned ${testRes.status}: ${testRes.statusText}`);
        }
        const testData = await testRes.json();
        console.log('Server connectivity test successful:', testData);
      } catch (testErr) {
        console.error('Server connectivity test failed:', testErr);
        alert(`Unable to connect to server: ${testErr.message}. Is the server running?`);
        setProcessingComplaint(false);
        return;
      }
      
      console.log('Making fetch request to:', 'http://localhost:4000/fileComplaint');
      console.log('Request payload:', JSON.stringify(complaintData));
      
      // Explicitly logging the structure of the request
      console.log('Fetch request details:', {
        url: 'http://localhost:4000/fileComplaint',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token ? `${token.substring(0, 10)}...` : 'No token'}`,
          'Content-Type': 'application/json'
        },
        body: complaintData
      });
      
      const res = await fetch('http://localhost:4000/fileComplaint', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(complaintData)
      });
      
      console.log('Response received:', {
        status: res.status,
        statusText: res.statusText,
        headers: Object.fromEntries([...res.headers.entries()])
      });
      
      let data;
      try {
        const text = await res.text();
        console.log('Raw response text:', text);
        
        try {
          data = JSON.parse(text);
          console.log('Parsed response data:', data);
        } catch (parseErr) {
          console.error('Failed to parse response as JSON:', parseErr);
          alert(`Server returned invalid JSON: ${text}`);
          setProcessingComplaint(false);
          return;
        }
      } catch (textErr) {
        console.error('Failed to read response text:', textErr);
        alert('Error reading server response. Check console for details.');
        setProcessingComplaint(false);
        return;
      }

      if (res.ok) {
        console.log('Complaint submitted successfully');
        alert(`Complaint filed successfully! ID: ${data.complaint_id}`);
        setShowComplaintModal(false);
        
        // Update orders to show the complaint
        setOrders(orders.map(order => 
          order.order_id === Number(complaintData.order_id) 
            ? {...order, complaint_type: complaintData.complaint_type, complaint_status: 'Open'} 
            : order
        ));
      } else {
        // Improved error handling for when data is empty or doesn't have expected properties
        console.error('Complaint submission failed:', data);
        
        // Extract meaningful error message with fallbacks for different scenarios
        let errorMessage = 'Unknown error';
        
        if (data) {
          if (typeof data === 'string') {
            // If the server returned a plain text error
            errorMessage = data;
          } else if (data.error) {
            // If the server returned an error object with an error property
            errorMessage = data.error;
          } else if (data.message) {
            // If the server returned an error object with a message property
            errorMessage = data.message;
          } else if (Object.keys(data).length === 0) {
            // If the server returned an empty object
            errorMessage = `Server error (Status: ${res.status} - ${res.statusText})`;
          }
        }
        
        alert(`Filing complaint failed: ${errorMessage}`);
      }
    } catch (err) {
      console.error('Complaint submission error:', err);
      alert(`Something went wrong with filing the complaint: ${err.message}`);
    } finally {
      setProcessingComplaint(false);
    }
  };

  const openPaymentModal = (orderId) => {
    // Set payment_date to today's date automatically
    const today = new Date().toISOString().split('T')[0];
    setPaymentData({
      order_id: orderId,
      payment_mode: 'Credit Card', 
      date: today
    });
    setShowPaymentModal(true);
  };

  const openComplaintModal = (orderId) => {
    setComplaintData({
      order_id: orderId,
      complaint_type: 'Damaged',
      complaint_details: ''
    });
    setShowComplaintModal(true);
  };

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
              <p><strong>Order ID:</strong> 
                <Link href={`/dashboard/order/${order.order_id}`} className="text-blue-600 hover:underline ml-1">
                  {order.order_id}
                </Link>
              </p>
              <div className="flex items-center">
                <strong>Status:</strong> 
                <span className={`inline-flex items-center ml-2 ${
                  order.order_status === 'Delivered' ? 'text-green-600' : 
                  order.order_status === 'Picked up' ? 'text-blue-600' : 'text-yellow-600'
                }`}>
                  {order.order_status}
                </span>
                <div className="ml-2">
                  <select 
                    className="border rounded p-1 text-sm"
                    onChange={(e) => handleUpdateOrderStatus(order.order_id, e.target.value)}
                    disabled={statusUpdating}
                    defaultValue=""
                  >
                    <option value="" disabled>Update</option>
                    <option value="Pending">Pending</option>
                    <option value="Picked up">Picked up</option>
                    <option value="Delivered">Delivered</option>
                  </select>
                </div>
              </div>
              <p><strong>Total:</strong> ₹{order.Total_Amount}</p>
              <p><strong>Pickup Date:</strong> {new Date(order.Pickup_Date).toLocaleDateString()}</p>
              {order.Delivery_Date && (
                <p><strong>Delivery Date:</strong> {new Date(order.Delivery_Date).toLocaleDateString()}</p>
              )}
              <p><strong>Items:</strong> {order.items}</p>
              
              {order.Payment_Mode ? (
                <p className="col-span-2"><strong>Payment:</strong> {order.Payment_Mode} - ₹{order.Amount}</p>
              ) : (
                <p className="col-span-2 text-yellow-600"><strong>Payment Status:</strong> Pending</p>
              )}
              
              {order.complaint_type && (
                <p className="col-span-2 text-red-600">
                  <strong>Complaint:</strong> {order.complaint_type} ({order.complaint_status})
                </p>
              )}

              <div className="col-span-2 mt-3 flex gap-2">
                {!order.Payment_Mode && (
                  <button 
                    onClick={() => openPaymentModal(order.order_id)}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                  >
                    Make Payment
                  </button>
                )}
                
                {!order.complaint_type && (
                  <button 
                    onClick={() => openComplaintModal(order.order_id)}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                  >
                    File Complaint
                  </button>
                )}
              </div>
            </div>
          </div>
        ))
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96 max-w-full">
            <h3 className="text-xl font-bold mb-4">Make Payment</h3>
            <form onSubmit={handlePayment}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Order ID</label>
                <input 
                  type="text" 
                  value={paymentData.order_id} 
                  readOnly 
                  className="w-full p-2 border rounded bg-gray-100"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Payment Method</label>
                <select
                  value={paymentData.payment_mode}
                  onChange={(e) => setPaymentData({...paymentData, payment_mode: e.target.value})}
                  className="w-full p-2 border rounded"
                >
                  <option value="Cash">Cash</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="Internet Banking">Internet Banking</option>
                  <option value="UPI">UPI</option>
                </select>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Payment Date</label>
                <input 
                  type="date"
                  value={paymentData.date}
                  readOnly
                  disabled
                  className="w-full p-2 border rounded bg-gray-100"
                />
                <p className="text-xs text-gray-500 mt-1">Payment date is set to today automatically</p>
              </div>
              
              <div className="flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 border rounded"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={processingPayment}
                  className="px-4 py-2 bg-blue-600 text-white rounded"
                >
                  {processingPayment ? 'Processing...' : 'Pay Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complaint Modal */}
      {showComplaintModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96 max-w-full">
            <h3 className="text-xl font-bold mb-4">File a Complaint</h3>
            <form onSubmit={handleFileComplaint}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Order ID</label>
                <input 
                  type="text" 
                  value={complaintData.order_id} 
                  readOnly 
                  className="w-full p-2 border rounded bg-gray-100"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Complaint Type</label>
                <select
                  value={complaintData.complaint_type}
                  onChange={(e) => setComplaintData({...complaintData, complaint_type: e.target.value})}
                  className="w-full p-2 border rounded"
                >
                  <option value="Missing">Missing Items</option>
                  <option value="Damaged">Damaged Items</option>
                  <option value="Faded">Faded Colors</option>
                  <option value="Other">Other Issue</option>
                </select>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Complaint Details</label>
                <textarea 
                  value={complaintData.complaint_details}
                  onChange={(e) => setComplaintData({...complaintData, complaint_details: e.target.value})}
                  className="w-full p-2 border rounded h-24"
                  required
                  placeholder="Please provide details about your complaint..."
                ></textarea>
                <p className="text-xs text-gray-600 mt-1">Complaint details are required. Please be specific about the issue.</p>
              </div>
              
              <div className="flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setShowComplaintModal(false)}
                  className="px-4 py-2 border rounded"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={processingComplaint || !complaintData.complaint_details}
                  className="px-4 py-2 bg-red-500 text-white rounded"
                >
                  {processingComplaint ? 'Processing...' : 'Submit Complaint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
