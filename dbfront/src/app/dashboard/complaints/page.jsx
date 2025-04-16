'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ComplaintsPage() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    
    if (!token) {
      router.push('/login');
      return;
    }

    setIsAdmin(role === 'admin');

    const fetchComplaints = async () => {
      try {
        const res = await fetch('http://localhost:4000/getComplaints', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          throw new Error('Failed to fetch complaints');
        }

        const data = await res.json();
        // Sort complaints in descending order by complaint_id (newest first)
        const sortedComplaints = data.sort((a, b) => b.complaint_id - a.complaint_id);
        setComplaints(sortedComplaints);
      } catch (err) {
        console.error('Error fetching complaints:', err);
        setError('Failed to load complaints');
      } finally {
        setLoading(false);
      }
    };

    fetchComplaints();
  }, [router]);

  const handleUpdateStatus = async (complaintId, newStatus) => {
    if (!isAdmin) return;
    
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'Resolved':
        return 'text-green-600';
      case 'In Progress':
        return 'text-blue-600';
      default:
        return 'text-yellow-600';
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Complaints</h1>
        <Link href="/dashboard" className="text-blue-600 hover:underline">
          Back to Dashboard
        </Link>
      </div>

      {loading ? (
        <p className="text-center py-10">Loading complaints...</p>
      ) : error ? (
        <p className="text-center py-10 text-red-600">{error}</p>
      ) : complaints.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-xl">
          <p className="text-gray-500">You haven't filed any complaints yet.</p>
          <Link href="/dashboard" className="text-blue-600 hover:underline inline-block mt-2">
            View your orders
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {complaints.map((complaint) => (
            <div key={complaint.complaint_id} className="bg-white rounded-xl shadow p-6 border">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-500 text-sm">Complaint ID</p>
                  <p className="font-medium">{complaint.complaint_id}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Order ID</p>
                  <Link href={`/dashboard/order/${complaint.order_id}`} className="font-medium text-blue-600 hover:underline">
                    {complaint.order_id}
                  </Link>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Type</p>
                  <p className="font-medium">{complaint.complaint_type}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Status</p>
                  <p className={`font-medium ${getStatusColor(complaint.complaint_status)}`}>
                    {complaint.complaint_status}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-gray-500 text-sm">Details</p>
                  <p>{complaint.complaint_details}</p>
                </div>
                
                {isAdmin && (
                  <div className="md:col-span-2 mt-2 border-t pt-4">
                    <p className="text-sm font-medium mb-2">Admin Actions:</p>
                    <div className="flex gap-2">
                      <select 
                        className="border rounded p-1"
                        onChange={(e) => handleUpdateStatus(complaint.complaint_id, e.target.value)}
                        defaultValue=""
                      >
                        <option value="" disabled>Update Status</option>
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 