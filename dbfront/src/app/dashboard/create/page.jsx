'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const ITEMS = [
  { item_id: 1, label: "T-shirt - Full-sleeves", price: 25 },
  { item_id: 2, label: "T-shirt - Half-sleeves", price: 15 },
  { item_id: 3, label: "Pants - Casual", price: 30 },
  { item_id: 4, label: "Pants - Jeans", price: 20 },
  { item_id: 5, label: "T-shirt - Sleeveless", price: 18 },
  { item_id: 6, label: "T-shirt - V-neck", price: 22 },
  { item_id: 7, label: "T-shirt - Polo", price: 24 },
  { item_id: 8, label: "Pants - Chinos", price: 28 },
  { item_id: 9, label: "Pants - Formal", price: 35 },
  { item_id: 10, label: "Jacket - Leather", price: 50 },
  { item_id: 11, label: "Jacket - Denim", price: 40 },
  { item_id: 12, label: "Shirt - Checked", price: 27 },
  { item_id: 13, label: "Shirt - Plain", price: 23 },
  { item_id: 14, label: "Shorts - Cargo", price: 20 },
  { item_id: 15, label: "Shorts - Denim", price: 19 },
  { item_id: 16, label: "Hoodie - Zipper", price: 32 },
];

export default function CreateOrder() {
  const router = useRouter();
  const [pickupDate, setPickupDate] = useState('');
  const [items, setItems] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantity, setQuantity] = useState('');

  const handleAddItem = () => {
    if (!selectedItemId || !quantity) {
      alert('Select item and quantity');
      return;
    }

    setItems([...items, {
      item_id: Number(selectedItemId),
      quantity: Number(quantity)
    }]);

    setSelectedItemId('');
    setQuantity('');
  };

  const handleSubmit = async () => {
    const token = localStorage.getItem('token');
    const customer_id = localStorage.getItem('user_id');

    if (!pickupDate || items.length === 0) {
      alert('Enter pickup date and add items');
      return;
    }

    try {
        console.log({
            // customer_id: customer_id,
          pickup_date: pickupDate,
          items,
        })
      const res = await fetch('http://localhost:4000/order', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            // customer_id: customer_id,
          pickup_date: pickupDate,
          items,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        alert(`Order placed successfully! Order ID: ${data.order_id}`);
        router.push('/dashboard');
      } else {
        alert(data.error || 'Failed to place order');
      }
    } catch (err) {
      console.error('Order error:', err);
      alert('Something went wrong');
    }
  };

  return (
    <div className="p-10 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Place New Order</h1>

      <label className="block">
        Pickup Date:
        <input
          type="date"
          value={pickupDate}
          onChange={(e) => setPickupDate(e.target.value)}
          className="border p-2 w-full mt-1"
        />
      </label>

      <div className="flex gap-2 items-end">
        <select
          value={selectedItemId}
          onChange={(e) => setSelectedItemId(e.target.value)}
          className="border p-2 flex-1"
        >
          <option value="">Select Item</option>
          {ITEMS.map((item) => (
            <option key={item.item_id} value={item.item_id}>
              {item.label} - ₹{item.price}
            </option>
          ))}
        </select>

        <input
          type="number"
          placeholder="Qty"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="border p-2 w-20"
        />

        <button
          onClick={handleAddItem}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Add
        </button>
      </div>

      {items.length > 0 && (
        <div className="border rounded p-4 bg-gray-50">
          <h2 className="text-lg font-semibold mb-2">Items in Order</h2>
          <ul className="list-disc ml-6 space-y-1">
            {items.map((item, index) => {
              const label = ITEMS.find((i) => i.item_id === item.item_id)?.label || '';
              return (
                <li key={index}>
                  {label} - Qty: {item.quantity}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <button
        onClick={handleSubmit}
        className="bg-blue-600 text-white px-6 py-2 rounded"
      >
        Place Order
      </button>
    </div>
  );
}
