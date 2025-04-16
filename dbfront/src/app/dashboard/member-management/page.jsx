'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function MemberManagementPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [members, setMembers] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [newMember, setNewMember] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user', // default role
  });

  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    
    if (!token) {
      router.push('/login');
      return;
    }
    
    // Check if user is admin
    if (role !== 'admin') {
      setError('This page is accessible only to administrators');
      setTimeout(() => {
        router.push('/dashboard');
      }, 3000);
      return;
    } else {
      setIsAdmin(true);
      fetchMembers();
    }
  }, [router]);

  const fetchMembers = async () => {
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      console.log('Fetching members with token:', token ? 'Token exists' : 'No token');
      
      // First check if the server is accessible
      try {
        const debugResponse = await fetch('http://localhost:4000/debug');
        const debugData = await debugResponse.json();
        console.log('Server debug response:', debugData);
      } catch (debugErr) {
        console.error('Server connectivity test failed:', debugErr);
        throw new Error('Could not connect to server. Is it running?');
      }

      // Try alternative approach - make a direct SQL query but with a catch block
      let membersData = [];
      
      try {
        // First try with the admin/query endpoint
        const queryResponse = await fetch('http://localhost:4000/admin/query', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            query: 'SELECT ID, UserName, emailID, role FROM members LIMIT 50'
          })
        });
        
        const queryData = await queryResponse.json();
        
        if (queryResponse.ok && queryData.results) {
          console.log('Query successful, got', queryData.results.length, 'members');
          membersData = queryData.results;
        } else {
          console.error('Query failed:', queryData);
          throw new Error(queryData.error || 'Failed to query members');
        }
      } catch (queryErr) {
        console.error('Error with query endpoint:', queryErr);
        
        // Fallback to direct SQL statements that we know are safe
        try {
          // Try using a different approach - a safe SQL statement with basic members columns
          const fallbackQuery = "SELECT ID, UserName, emailID, IFNULL(role, 'user') as role FROM members WHERE isActive IS NULL OR isActive = 1 ORDER BY ID DESC LIMIT 50";
          
          const fallbackResponse = await fetch('http://localhost:4000/admin/query', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query: fallbackQuery })
          });
          
          const fallbackData = await fallbackResponse.json();
          
          if (fallbackResponse.ok && fallbackData.results) {
            console.log('Fallback query successful, got', fallbackData.results.length, 'members');
            membersData = fallbackData.results;
          } else {
            console.error('Fallback query failed:', fallbackData);
            throw new Error(fallbackData.error || 'Failed to query members');
          }
        } catch (fallbackErr) {
          console.error('Error with fallback query:', fallbackErr);
          
          // As a last resort, create mock data for demonstration
          console.warn('Using mock data as fallback');
          membersData = [
            { ID: 1, UserName: 'admin', emailID: 'admin@example.com', role: 'admin' },
            { ID: 2, UserName: 'user1', emailID: 'user1@example.com', role: 'user' },
            { ID: 3, UserName: 'user2', emailID: 'user2@example.com', role: 'user' }
          ];
          setError('Using demo data. Database connection failed.');
        }
      }
      
      setMembers(membersData);
      console.log('Members set to:', membersData);
    } catch (err) {
      console.error('Error fetching members:', err);
      setError(err.message || 'Failed to fetch members');
      setMembers([]); // Clear members on error
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!newMember.username || !newMember.email || !newMember.password) {
      setError('Please fill all required fields');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch('http://localhost:4000/admin/addmember', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: newMember.username,
          email: newMember.email,
          password: newMember.password,
          role: newMember.role
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add member');
      }
      
      setSuccessMessage(`Member ${newMember.username} added successfully!`);
      setShowAddModal(false);
      // Reset new member data
      setNewMember({
        username: '',
        email: '',
        password: '',
        role: 'user',
      });
      // Refresh member list
      fetchMembers();
    } catch (err) {
      console.error('Error adding member:', err);
      setError(err.message || 'Failed to add member');
    }
  };

  const handleDeleteMember = async () => {
    if (!selectedMember) return;
    
    try {
      const token = localStorage.getItem('token');
      
      // Check if user is trying to delete their own account
      const currentUsername = localStorage.getItem('username');
      if (selectedMember.UserName === currentUsername) {
        setError("You cannot delete your own account");
        setShowDeleteModal(false);
        return;
      }
      
      console.log('Deleting member:', selectedMember.ID);
      
      const response = await fetch('http://localhost:4000/admin/deletemember', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          memberID: selectedMember.ID
        })
      });
      
      const data = await response.json();
      console.log('Delete response:', data);
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete member');
      }
      
      setSuccessMessage(`Member ${selectedMember.UserName} deleted successfully!`);
      setShowDeleteModal(false);
      setSelectedMember(null);
      // Refresh member list
      fetchMembers();
    } catch (err) {
      console.error('Error deleting member:', err);
      setError(err.message || 'Failed to delete member');
      setShowDeleteModal(false);
    }
  };

  // Clear messages after 5 seconds
  useEffect(() => {
    let timeout;
    if (successMessage || error) {
      timeout = setTimeout(() => {
        setSuccessMessage('');
        setError('');
      }, 5000);
    }
    return () => clearTimeout(timeout);
  }, [successMessage, error]);

  if (!isAdmin) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p className="font-medium">Access Denied</p>
          <p className="text-sm mt-1">{error || 'You do not have permission to access this page. Redirecting...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Member Management</h1>
        <Link href="/dashboard" className="text-blue-600 hover:underline">
          Back to Dashboard
        </Link>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded">
          <p>{successMessage}</p>
        </div>
      )}
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
          <p>{error}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mb-6">
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded mr-3"
        >
          Add New Member
        </button>
      </div>

      {/* Members Table */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="text-lg font-semibold">Members List</h2>
        </div>
        
        {loading ? (
          <div className="p-6 text-center">Loading members...</div>
        ) : members.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No members found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {members.map((member) => (
                  <tr key={member.ID} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{member.ID}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{member.UserName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{member.emailID}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${member.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                        {member.role || 'user'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => {
                          setSelectedMember(member);
                          setShowDeleteModal(true);
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Add New Member</h3>
            
            <form onSubmit={handleAddMember}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Username</label>
                <input
                  type="text"
                  value={newMember.username}
                  onChange={(e) => setNewMember({...newMember, username: e.target.value})}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={newMember.email}
                  onChange={(e) => setNewMember({...newMember, email: e.target.value})}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Password</label>
                <input
                  type="password"
                  value={newMember.password}
                  onChange={(e) => setNewMember({...newMember, password: e.target.value})}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Role</label>
                <select
                  value={newMember.role}
                  onChange={(e) => setNewMember({...newMember, role: e.target.value})}
                  className="w-full p-2 border rounded"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded"
                >
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Confirm Deletion</h3>
            <p className="mb-6">
              Are you sure you want to delete the member <strong>{selectedMember.UserName}</strong>? 
              This action cannot be undone.
            </p>
            
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteMember}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 