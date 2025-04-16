'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function OrderDetail({ params }) {
  // Unwrap params using React.use()
  const unwrappedParams = use(params);
  const orderId = unwrappedParams.id;
  
  const router = useRouter();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [processingComplaint, setProcessingComplaint] = useState(false);
  
  const [paymentData, setPaymentData] = useState({
    order_id: orderId,
    payment_mode: 'Credit Card',
    date: new Date().toISOString().split('T')[0]
  });
  
  const [complaintData, setComplaintData] = useState({
    order_id: orderId,
    complaint_type: 'Damaged',
    complaint_details: ''
  });

  useEffect(() => {
    const checkAuth = async () => {
      setLoading(true);
      
      const token = localStorage.getItem('token');
      const role = localStorage.getItem('role');
      
      // Check if token exists
      if (!token) {
        console.error('No authentication token found');
        alert('Please log in to view order details');
        router.push('/login');
        return;
      }
      
      setIsAdmin(role === 'admin');
      
      // Validate token with server before proceeding
      try {
        console.log('Validating authentication token...');
        const authCheck = await fetch('http://localhost:4000/isAuth', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!authCheck.ok) {
          console.error('Authentication validation failed');
          localStorage.clear(); // Clear any invalid tokens
          alert('Your session has expired. Please log in again.');
          router.push('/login');
          return;
        }
        
        // Token is valid, proceed to fetch order details
        await fetchOrderDetails(token, role === 'admin');
        
      } catch (err) {
        console.error('Error checking authentication:', err);
        alert('Error validating your session. Please try logging in again.');
        router.push('/login');
      }
    };
    
    checkAuth();
  }, [orderId, router]);

  const fetchOrderDetails = async (token, isAdmin) => {
    try {
      // This would be better with a dedicated endpoint for single order
      // For now, we fetch all and filter
      const endpoint = isAdmin ? 'http://localhost:4000/protfolio/all' : 'http://localhost:4000/protfolio/me';
      
      console.log(`Fetching order details for order ID: ${orderId} from ${endpoint}`);
      console.log(`User role: ${isAdmin ? 'admin' : 'user'}, Token available: ${!!token}`);
      
      // Test server connectivity first
      try {
        const serverTest = await fetch('http://localhost:4000/debug');
        if (!serverTest.ok) {
          throw new Error('Server is not responding');
        }
        console.log('Server connectivity test succeeded');
      } catch (serverErr) {
        console.error('Server connectivity test failed:', serverErr);
        throw new Error('Unable to connect to server. Is it running?');
      }
      
      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log(`API response status: ${res.status} ${res.statusText}`);
      
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error('Authentication failed. Please log in again.');
        }
        throw new Error(`Failed to fetch order: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      console.log('Retrieved orders:', data.length, typeof data);
      
      // Check if data is empty
      if (!data || data.length === 0) {
        console.error('No orders returned from API');
        alert('No orders found. Returning to dashboard.');
        router.push('/dashboard');
        return;
      }
      
      // Convert both IDs to numbers for proper comparison
      const foundOrder = data.find(o => Number(o.order_id) === Number(orderId));
      
      if (!foundOrder) {
        console.error(`Order not found. Looking for ID: ${orderId} in ${data.length} orders`);
        console.log('Available order IDs:', data.map(o => o.order_id).join(', '));
        alert('Order not found');
        router.push('/dashboard');
        return;
      }
      
      console.log('Found order:', foundOrder);
      setOrder(foundOrder);
    } catch (err) {
      console.error('Error fetching order:', err);
      alert(`Failed to load order details: ${err.message}`);
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOrderStatus = async (newStatus) => {
    if (!isAdmin) return;
    
    const token = localStorage.getItem('token');
    
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
        setOrder({
          ...order, 
          order_status: newStatus,
          Delivery_Date: newStatus === 'Delivered' ? new Date().toISOString() : order.Delivery_Date
        });
        alert(`Order status updated to ${newStatus}`);
      } else {
        const errorData = await res.json();
        alert(`Error: ${errorData.error || 'Something went wrong'}`);
      }
    } catch (err) {
      console.error('Error updating order status:', err);
      alert('Failed to update order status');
    }
  };

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
        setOrder({
          ...order, 
          Payment_Mode: paymentData.payment_mode, 
          Amount: order.Total_Amount
        });
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
    const token = localStorage.getItem('token');
    setProcessingComplaint(true);

    try {
      console.log('Submitting complaint data:', complaintData);
      const res = await fetch('http://localhost:4000/fileComplaint', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(complaintData)
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
        setOrder({
          ...order, 
          complaint_type: complaintData.complaint_type, 
          complaint_status: 'Open'
        });
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

  if (loading) {
    return (
      <div className="p-10 text-center">
        <p className="text-lg">Loading order details...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-10 text-center">
        <p className="text-lg text-red-600">Order not found</p>
        <Link href="/dashboard" className="text-blue-600 underline mt-4 inline-block">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  // Calculate order progress percentage based on status
  const progressPercentage = 
    order.order_status === 'Delivered' ? 100 :
    order.order_status === 'Picked up' ? 66 : 33;

  return (
    <div className="p-10 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Order #{order.order_id}</h1>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              localStorage.clear(); // Clear all localStorage data
              router.push('/login');
            }}
            className="text-white bg-red-500 hover:bg-red-600 px-3 py-1 rounded text-sm"
          >
            Logout
          </button>
          <Link href="/dashboard" className="text-blue-600 hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Order Progress */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Order Progress</h2>
        <div className="relative pt-1">
          <div className="flex mb-2 items-center justify-between">
            <div className="text-left">
              <span className="text-xs font-semibold inline-block uppercase">
                Status: {order.order_status}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold inline-block uppercase">
                {progressPercentage}%
              </span>
            </div>
          </div>
          <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
            <div 
              style={{ width: `${progressPercentage}%` }} 
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-600"
            ></div>
          </div>
          <div className="flex justify-between text-xs">
            <div className={`${progressPercentage >= 33 ? 'text-blue-600 font-semibold' : ''}`}>Pending</div>
            <div className={`${progressPercentage >= 66 ? 'text-blue-600 font-semibold' : ''}`}>Picked up</div>
            <div className={`${progressPercentage >= 100 ? 'text-blue-600 font-semibold' : ''}`}>Delivered</div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Order Details */}
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h2 className="text-xl font-semibold mb-4">Order Details</h2>
          <div className="space-y-3">
            <p><span className="font-medium">Status:</span> 
              <span className={`ml-2 ${
                order.order_status === 'Delivered' ? 'text-green-600' : 
                order.order_status === 'Picked up' ? 'text-blue-600' : 'text-yellow-600'
              }`}>
                {order.order_status}
              </span>
            </p>
            <p><span className="font-medium">Total Amount:</span> ₹{order.Total_Amount}</p>
            <p><span className="font-medium">Pickup Date:</span> {new Date(order.Pickup_Date).toLocaleDateString()}</p>
            {order.Delivery_Date && (
              <p><span className="font-medium">Delivery Date:</span> {new Date(order.Delivery_Date).toLocaleDateString()}</p>
            )}
            <p><span className="font-medium">Items:</span> {order.items}</p>
            
            {isAdmin && (
              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">Update Status:</label>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleUpdateOrderStatus('Pending')}
                    className="px-3 py-1 bg-yellow-500 text-white rounded text-sm"
                  >
                    Pending
                  </button>
                  <button 
                    onClick={() => handleUpdateOrderStatus('Picked up')}
                    className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
                  >
                    Picked up
                  </button>
                  <button 
                    onClick={() => handleUpdateOrderStatus('Delivered')}
                    className="px-3 py-1 bg-green-500 text-white rounded text-sm"
                  >
                    Delivered
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Payment & Complaint Info */}
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h2 className="text-xl font-semibold mb-4">Payment & Complaint</h2>
          <div className="space-y-4">
            {order.Payment_Mode ? (
              <div className="bg-green-50 border border-green-200 rounded p-3">
                <h3 className="font-medium text-green-700">Payment Information</h3>
                <p className="text-sm mt-1">Mode: {order.Payment_Mode}</p>
                <p className="text-sm">Amount: ₹{order.Amount}</p>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                <h3 className="font-medium text-yellow-700">Payment Pending</h3>
                <p className="text-sm mt-1">Your order has not been paid for yet.</p>
                {!isAdmin && (
                  <button 
                    onClick={() => setShowPaymentModal(true)}
                    className="mt-2 bg-blue-600 text-white px-3 py-1 rounded text-sm"
                  >
                    Make Payment
                  </button>
                )}
              </div>
            )}

            {order.complaint_type ? (
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <h3 className="font-medium text-red-700">Complaint Filed</h3>
                <p className="text-sm mt-1">Type: {order.complaint_type}</p>
                <p className="text-sm">Status: {order.complaint_status}</p>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded p-3">
                <h3 className="font-medium text-gray-700">No Complaints</h3>
                <p className="text-sm mt-1">If you're unsatisfied with the service, you can file a complaint.</p>
                {!isAdmin && (
                  <button 
                    onClick={() => setShowComplaintModal(true)}
                    className="mt-2 bg-red-500 text-white px-3 py-1 rounded text-sm"
                  >
                    File Complaint
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

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