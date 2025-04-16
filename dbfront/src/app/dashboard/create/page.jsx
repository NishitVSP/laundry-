'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Group items by category for better organization
const ITEM_CATEGORIES = {
  'T-shirts': [
    { item_id: 1, label: "T-shirt - Full-sleeves", price: 25 },
    { item_id: 2, label: "T-shirt - Half-sleeves", price: 15 },
    { item_id: 5, label: "T-shirt - Sleeveless", price: 18 },
    { item_id: 6, label: "T-shirt - V-neck", price: 22 },
    { item_id: 7, label: "T-shirt - Polo", price: 24 },
  ],
  'Pants': [
    { item_id: 3, label: "Pants - Casual", price: 30 },
    { item_id: 4, label: "Pants - Jeans", price: 20 },
    { item_id: 8, label: "Pants - Chinos", price: 28 },
    { item_id: 9, label: "Pants - Formal", price: 35 },
  ],
  'Jackets': [
    { item_id: 10, label: "Jacket - Leather", price: 50 },
    { item_id: 11, label: "Jacket - Denim", price: 40 },
    { item_id: 16, label: "Hoodie - Zipper", price: 32 },
  ],
  'Shirts': [
    { item_id: 12, label: "Shirt - Checked", price: 27 },
    { item_id: 13, label: "Shirt - Plain", price: 23 },
  ],
  'Shorts': [
    { item_id: 14, label: "Shorts - Cargo", price: 20 },
    { item_id: 15, label: "Shorts - Denim", price: 19 },
  ],
};

// Flatten items for easy lookup
const ITEMS = Object.values(ITEM_CATEGORIES).flat();

export default function CreateOrder() {
  const router = useRouter();
  const [pickupDate, setPickupDate] = useState('');
  const [items, setItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(Object.keys(ITEM_CATEGORIES)[0]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [minDate, setMinDate] = useState('');

  // Set minimum pickup date to tomorrow
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setMinDate(tomorrow.toISOString().split('T')[0]);
    setPickupDate(tomorrow.toISOString().split('T')[0]);
  }, []);

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setSelectedItemId('');
  };

  const handleAddItem = () => {
    if (!selectedItemId || !quantity || quantity < 1) {
      setError('Please select an item and enter a valid quantity');
      return;
    }

    // Check if item already exists in order
    const existingItemIndex = items.findIndex(item => item.item_id === Number(selectedItemId));
    
    if (existingItemIndex >= 0) {
      // Update quantity of existing item
      const updatedItems = [...items];
      updatedItems[existingItemIndex].quantity += Number(quantity);
      setItems(updatedItems);
    } else {
      // Add as new item
      setItems([...items, {
        item_id: Number(selectedItemId),
        quantity: Number(quantity)
      }]);
    }

    setSelectedItemId('');
    setQuantity(1);
    setError('');
  };

  const handleRemoveItem = (index) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const calculateTotal = () => {
    return items.reduce((total, item) => {
      const itemData = ITEMS.find(i => i.item_id === item.item_id);
      return total + (itemData?.price || 0) * item.quantity;
    }, 0);
  };

  const handleSubmit = async () => {
    if (!pickupDate) {
      setError('Please select a pickup date');
      return;
    }

    if (items.length === 0) {
      setError('Please add at least one item to your order');
      return;
    }

    const pickupDateObj = new Date(pickupDate);
    const today = new Date();
    
    if (pickupDateObj <= today) {
      setError('Pickup date must be at least tomorrow');
      return;
    }

    setLoading(true);
    setError('');

    const token = localStorage.getItem('token');

    try {
      const res = await fetch('http://localhost:4000/order', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pickup_date: pickupDate,
          items,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        // Use browser's native confirm for better UX
        if (window.confirm(`Order placed successfully! Order ID: ${data.order_id}\n\nDo you want to view your orders?`)) {
          router.push('/dashboard');
        } else {
          // Reset form for a new order
          setItems([]);
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          setPickupDate(tomorrow.toISOString().split('T')[0]);
        }
      } else {
        setError(data.error || 'Failed to place order');
      }
    } catch (err) {
      console.error('Order error:', err);
      setError('Something went wrong with the server. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-blue-600">Place New Order</h1>
        <Link href="/dashboard" className="text-blue-600 hover:underline">
          Back to Dashboard
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        {/* Order Form */}
        <div className="space-y-6 bg-white p-6 rounded-xl shadow-md">
          <h2 className="text-xl font-semibold border-b pb-2">Order Details</h2>
          
          <div>
            <label className="block text-sm font-medium mb-1">Pickup Date:</label>
            <input
              type="date"
              value={pickupDate}
              min={minDate}
              onChange={(e) => setPickupDate(e.target.value)}
              className="border rounded p-2 w-full focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Earliest pickup date is tomorrow</p>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-medium mb-2">Select Items:</h3>
            
            {/* Category selection */}
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.keys(ITEM_CATEGORIES).map((category) => (
                <button
                  key={category}
                  onClick={() => handleCategoryChange(category)}
                  className={`px-3 py-1 text-sm rounded ${
                    selectedCategory === category
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Item Type:</label>
                <select
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  className="border rounded p-2 w-full focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Item</option>
                  {ITEM_CATEGORIES[selectedCategory].map((item) => (
                    <option key={item.item_id} value={item.item_id}>
                      {item.label} - ₹{item.price}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Quantity:</label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="border rounded p-2 w-full focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div className="flex items-end">
                  <button
                    onClick={handleAddItem}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                  >
                    Add to Order
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-semibold border-b pb-2 mb-4">Order Summary</h2>
            
            {items.length === 0 ? (
              <p className="text-gray-500 italic text-center py-6">Your order is empty. Please add some items.</p>
            ) : (
              <div>
                <div className="divide-y">
                  {items.map((item, index) => {
                    const itemData = ITEMS.find(i => i.item_id === item.item_id);
                    return (
                      <div key={index} className="py-3 flex justify-between items-center">
                        <div>
                          <p className="font-medium">{itemData?.label}</p>
                          <p className="text-sm text-gray-600">
                            {item.quantity} × ₹{itemData?.price} = ₹{(itemData?.price || 0) * item.quantity}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemoveItem(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })}
                </div>
                
                <div className="border-t mt-4 pt-4">
                  <div className="flex justify-between items-center font-semibold text-lg">
                    <span>Total Amount:</span>
                    <span>₹{calculateTotal()}</span>
                  </div>
                  
                  <p className="text-xs text-gray-500 mt-1">
                    Payment will be processed after your order is submitted
                  </p>
                </div>
              </div>
            )}
          </div>
          
          <button
            onClick={handleSubmit}
            disabled={loading || items.length === 0}
            className={`w-full py-3 rounded-lg text-white text-lg font-semibold ${
              loading || items.length === 0
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? 'Processing...' : 'Place Order'}
          </button>
        </div>
      </div>
    </div>
  );
}
