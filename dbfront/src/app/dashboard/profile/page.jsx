'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showImageModal, setShowImageModal] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [updatingImage, setUpdatingImage] = useState(false);
  const [updatingAddress, setUpdatingAddress] = useState(false);
  const [addressData, setAddressData] = useState({
    street: '',
    city: '',
    state: '',
    zipcode: '',
  });
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [updatingPhone, setUpdatingPhone] = useState(false);
  const fileInputRef = useRef(null);
  const router = useRouter();
  const [previewError, setPreviewError] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const fetchProfile = async () => {
      try {
        const res = await fetch('http://localhost:4000/profile/getProfile', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to fetch profile');
        }

        const data = await res.json();
        setProfile(data);
        
        // Check if user has an address - only for regular users
        if (data.role !== 'admin' && !data.customer_address) {
          setIsNewUser(true);
          setShowAddressModal(true); // Automatically show address modal for new users
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError(err.message || 'Something went wrong');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [router]);

  // Helper function to get profile image URL
  const getProfileImageUrl = () => {
    if (!profile) {
      return null;
    }
    
    if (profile.role === 'admin') {
      return profile.staff_image || null;
    } else {
      return profile.customer_image || null;
    }
  };

  // Function to handle image update
  const handleImageUpdate = async (e) => {
    e.preventDefault();
    
    if (!newImageUrl.trim()) {
      alert('Please enter a valid image URL');
      return;
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
      alert('You need to be logged in to update your profile');
      router.push('/login');
      return;
    }
    
    setUpdatingImage(true);
    console.log('Sending image update request with token:', token ? `${token.substring(0, 10)}...` : 'No token');
    
    try {
      // Log the request for debugging
      console.log('Updating profile image with URL:', newImageUrl);
      
      const res = await fetch('http://localhost:4000/add-image', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          imagePath: newImageUrl // Changed from imageUrl to imagePath
        })
      });
      
      console.log('Response status:', res.status);
      const data = await res.json();
      console.log('Response data:', data);
      
      if (res.ok) {
        alert('Profile image updated successfully!');
        // Update local profile data based on role
        setProfile(prev => ({
          ...prev,
          [profile.role === 'admin' ? 'staff_image' : 'customer_image']: newImageUrl
        }));
        // Close the modal
        setShowImageModal(false);
        setNewImageUrl('');
        setPreviewError(false);
      } else {
        alert(`Failed to update image: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error updating image:', err);
      alert(`Error updating image: ${err.message}`);
    } finally {
      setUpdatingImage(false);
    }
  };

  // Function to handle address update - only for non-admin users
  const handleAddressUpdate = async (e) => {
    e.preventDefault();
    
    // Prevent admin users from updating address
    if (profile.role === 'admin') {
      alert('Admin users do not have address information');
      setShowAddressModal(false);
      return;
    }
    
    // Validate address fields
    if (!addressData.street || !addressData.city || !addressData.state || !addressData.zipcode) {
      alert('Please fill in all address fields');
      return;
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
      alert('You need to be logged in to update your profile');
      router.push('/login');
      return;
    }
    
    setUpdatingAddress(true);
    
    try {
      console.log('Updating address with data:', addressData);
      
      // Format the address as a single string to match the expected format
      const formattedAddress = `${addressData.street}, ${addressData.city}, ${addressData.state}, ${addressData.zipcode}`;
      
      // First try the profile route
      let endpoint = 'http://localhost:4000/profile/update-address';
      
      // Log the token for debugging (masked for security)
      console.log('Using auth token (first 10 chars):', token ? `${token.substring(0, 10)}...` : 'No token');
      
      console.log('Trying to update address using endpoint:', endpoint);
      let res = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          address: formattedAddress
        })
      });
      
      // If profile route fails, try the direct route
      if (!res.ok) {
        console.warn('Profile route failed, trying direct route');
        endpoint = 'http://localhost:4000/update-address';
        
        console.log('Trying to update address using endpoint:', endpoint);
        res = await fetch(endpoint, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            address: formattedAddress
          })
        });
      }
      
      // Log response details for debugging
      console.log('Response status:', res.status);
      
      // Check if response is valid JSON
      let text = await res.text();
      let data;
      
      try {
        data = JSON.parse(text);
        console.log('Response data:', data);
      } catch (e) {
        console.error('Response is not valid JSON:', text);
        throw new Error('Invalid JSON response from server');
      }
      
      if (res.ok) {
        alert('Address updated successfully!');
        // Update local profile data
        setProfile(prev => ({
          ...prev,
          customer_address: formattedAddress
        }));
        // Close the modal
        setShowAddressModal(false);
        setIsNewUser(false);
      } else {
        alert(`Failed to update address: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error updating address:', err);
      alert(`Error updating address: ${err.message}`);
    } finally {
      setUpdatingAddress(false);
    }
  };

  // Function to handle phone update
  const handlePhoneUpdate = async (e) => {
    e.preventDefault();
    
    const token = localStorage.getItem('token');
    if (!token) {
      alert('You need to be logged in to update your profile');
      router.push('/login');
      return;
    }
    
    setUpdatingPhone(true);
    
    try {
      console.log('Updating phone with:', phoneNumber);
      
      // First try the profile route
      let endpoint = 'http://localhost:4000/profile/update-phone';
      
      console.log('Trying to update phone using endpoint:', endpoint);
      let res = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          phone: phoneNumber
        })
      });
      
      // If profile route fails, try the direct route
      if (!res.ok) {
        console.warn('Profile route failed, trying direct route');
        endpoint = 'http://localhost:4000/update-phone';
        
        console.log('Trying to update phone using endpoint:', endpoint);
        res = await fetch(endpoint, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            phone: phoneNumber
          })
        });
      }
      
      // Log response details for debugging
      console.log('Response status:', res.status);
      
      // Check if response is valid JSON
      let text = await res.text();
      let data;
      
      try {
        data = JSON.parse(text);
        console.log('Response data:', data);
      } catch (e) {
        console.error('Response is not valid JSON:', text);
        throw new Error('Invalid JSON response from server');
      }
      
      if (res.ok) {
        alert('Phone number updated successfully!');
        // Update local profile data based on role
        setProfile(prev => ({
          ...prev,
          [profile.role === 'admin' ? 'staff_phone' : 'customer_phone']: phoneNumber
        }));
        // Close the modal
        setShowPhoneModal(false);
      } else {
        alert(`Failed to update phone: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error updating phone:', err);
      alert(`Error updating phone: ${err.message}`);
    } finally {
      setUpdatingPhone(false);
    }
  };

  // Reset preview error when URL changes
  useEffect(() => {
    setPreviewError(false);
  }, [newImageUrl]);

  // Function to close image modal and reset state
  const closeImageModal = () => {
    setShowImageModal(false);
    setNewImageUrl('');
    setPreviewError(false);
  };

  // Function to open address modal and pre-fill existing address if available
  const openAddressModal = () => {
    // Don't open address modal for admin users
    if (profile?.role === 'admin') {
      alert('Admin users do not have address information');
      return;
    }
    
    // Check for existing address
    const existingAddress = profile.customer_address;
      
    if (existingAddress) {
      // Parse existing address if available
      try {
        const addressParts = existingAddress.split(',').map(part => part.trim());
        if (addressParts.length >= 4) {
          setAddressData({
            street: addressParts[0],
            city: addressParts[1],
            state: addressParts[2],
            zipcode: addressParts[3]
          });
        }
      } catch (error) {
        console.error('Error parsing address:', error);
        // If parsing fails, just set empty fields
        setAddressData({
          street: '',
          city: '',
          state: '',
          zipcode: ''
        });
      }
    }
    setShowAddressModal(true);
  };

  // Function to close address modal
  const closeAddressModal = () => {
    // Don't allow new users to close the modal before submitting an address
    if (isNewUser && profile.role !== 'admin') {
      alert('Please add your address to continue');
      return;
    }
    setShowAddressModal(false);
  };

  // Function to open phone modal and pre-fill existing phone if available
  const openPhoneModal = () => {
    // Set phone number based on role
    setPhoneNumber(profile.role === 'admin' ? profile.staff_phone || '' : profile.customer_phone || '');
    setShowPhoneModal(true);
  };

  // Function to close phone modal
  const closePhoneModal = () => {
    setShowPhoneModal(false);
  };

  if (loading) return <div className="p-10 text-center">Loading profile...</div>;
  if (error) return <div className="p-10 text-center text-red-600">{error}</div>;
  if (!profile) return <div className="p-10 text-center">No profile found</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Your Profile</h1>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              localStorage.clear(); // Clear all localStorage data
              router.push('/login');
            }}
            className="text-white bg-red-500 hover:bg-red-600 px-4 py-2 rounded"
          >
            Logout
          </button>
          <Link href="/dashboard" className="text-blue-600 hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-8">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="relative">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-blue-500 flex items-center justify-center">
                {getProfileImageUrl() ? (
                  <img 
                    src={getProfileImageUrl()} 
                    alt={`${profile.role === 'admin' ? profile.staff_name : profile.customer_name}'s profile`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-blue-600 flex flex-col items-center justify-center text-white text-sm font-medium p-2">
                    <span className="text-xl font-bold">Fresh</span>
                    <span className="text-xl font-bold">Wash</span>
                    <span className="text-xs mt-1">User</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowImageModal(true)}
                className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-2 shadow-md hover:bg-blue-700 transition-colors"
                title="Change profile image"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-2">
                {profile.role === 'admin' ? profile.staff_name : profile.customer_name}
              </h2>
              <p className="text-gray-500 mb-1">
                <span className="inline-block px-3 py-1 bg-gray-200 rounded-full text-sm font-medium">
                  {profile.role}
                </span>
              </p>
            </div>
          </div>

          <div className="mt-8 border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Account Information</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">{profile.role === 'admin' ? 'Staff ID' : 'Customer ID'}</p>
                <p className="font-medium">{profile.role === 'admin' ? profile.staff_id : profile.customer_id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{profile.role === 'admin' ? profile.staff_email : profile.customer_email}</p>
              </div>
              
              {/* Role-specific fields */}
              {profile.role === 'admin' ? (
                <>
                  <div>
                    <p className="text-sm text-gray-500">Hire Date</p>
                    <p className="font-medium">{profile.hire_date ? new Date(profile.hire_date).toLocaleDateString() : 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Age</p>
                    <p className="font-medium">{profile.staff_age || 'Not specified'}</p>
                  </div>
                </>
              ) : (
                <div>
                  <p className="text-sm text-gray-500">Age</p>
                  <p className="font-medium">{profile.customer_age || 'Not specified'}</p>
                </div>
              )}
              
              {/* Phone field - shown for both roles but with role-specific field names */}
              {(profile.customer_phone || profile.staff_phone) && (
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium">{profile.role === 'admin' ? profile.staff_phone : profile.customer_phone}</p>
                </div>
              )}
              
              {/* Address section - only shown for non-admin users */}
              {profile.role !== 'admin' && (
                <div className="md:col-span-2 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Address</span>
                    <button 
                      onClick={openAddressModal}
                      className="text-blue-600 text-sm hover:underline flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                      {profile.customer_address ? 'Edit' : 'Add'} Address
                    </button>
                  </div>
                  {profile.customer_address 
                    ? <p className="font-medium">{profile.customer_address}</p>
                    : <p className="text-red-500 italic">No address provided. Please add your address.</p>
                  }
                </div>
              )}
              
              <div className="md:col-span-2 mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Phone Number</span>
                  <button 
                    onClick={openPhoneModal}
                    className="text-blue-600 text-sm hover:underline flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                    {profile.role === 'admin'
                      ? (profile.staff_phone ? 'Edit' : 'Add') 
                      : (profile.customer_phone ? 'Edit' : 'Add')} Phone
                  </button>
                </div>
                {profile.role === 'admin'
                  ? (profile.staff_phone 
                      ? <p className="font-medium">{profile.staff_phone}</p>
                      : <p className="text-gray-500 italic">No phone number provided. (Optional)</p>)
                  : (profile.customer_phone 
                      ? <p className="font-medium">{profile.customer_phone}</p>
                      : <p className="text-gray-500 italic">No phone number provided. (Optional)</p>)
                }
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-center">
            <Link 
              href="/dashboard"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Image Update Modal */}
      {showImageModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={closeImageModal}
          onKeyDown={(e) => {
            if (e.key === 'Escape') closeImageModal();
          }}
        >
          <div 
            className="bg-white p-6 rounded-lg w-[450px] max-w-full"
            onClick={(e) => e.stopPropagation()} // Prevent clicks inside modal from closing it
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Update Profile Image</h3>
              <button 
                type="button"
                onClick={closeImageModal}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleImageUpdate}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Image URL</label>
                <input 
                  type="text" 
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="Enter image URL"
                  className="w-full p-2 border rounded"
                  required
                  autoFocus
                />
                <div className="text-xs text-gray-600 mt-2">
                  <p>Note: It's okay if the preview doesn't work - the URL will still be stored</p>
                </div>
              </div>
              
              {newImageUrl && !previewError ? (
                <div className="mb-4">
                  <p className="text-sm font-medium mb-1">Preview (optional):</p>
                  <div className="h-24 w-24 rounded-full overflow-hidden bg-gray-100 mx-auto">
                    <img 
                      src={newImageUrl} 
                      alt="Preview" 
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        // Prevent infinite error alerts
                        setPreviewError(true);
                        console.error("Image preview failed to load", newImageUrl);
                      }}
                    />
                  </div>
                </div>
              ) : previewError ? (
                <div className="mb-4">
                  <p className="text-sm font-medium mb-1 text-orange-600">Preview Not Available:</p>
                  <div className="h-24 w-24 rounded-full overflow-hidden bg-blue-600 mx-auto flex flex-col items-center justify-center text-white text-xs p-1">
                    <span className="font-bold">Fresh</span>
                    <span className="font-bold">Wash</span>
                    <span className="text-[7px]">User</span>
                  </div>
                  <p className="text-xs text-center mt-2">
                    <span className="text-orange-600">Note: It's okay if the preview doesn't work - the URL will still be stored</span>
                  </p>
                </div>
              ) : null}
              
              <div className="flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={closeImageModal}
                  className="px-4 py-2 border rounded"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={updatingImage || !newImageUrl.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-blue-300"
                >
                  {updatingImage ? 'Updating...' : 'Update Image'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Address Update Modal */}
      {showAddressModal && profile.role !== 'admin' && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={isNewUser ? null : closeAddressModal}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && !isNewUser) closeAddressModal();
          }}
        >
          <div 
            className="bg-white p-6 rounded-lg w-[500px] max-w-full"
            onClick={(e) => e.stopPropagation()} // Prevent clicks inside modal from closing it
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">{isNewUser ? 'Add Your Address' : 'Update Address'}</h3>
              {!isNewUser && (
                <button 
                  type="button"
                  onClick={closeAddressModal}
                  className="text-gray-500 hover:text-gray-700"
                  aria-label="Close"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
            
            {isNewUser && (
              <div className="mb-4 p-3 bg-blue-50 text-blue-800 rounded-md">
                <p className="text-sm">Welcome to Fresh Wash! Please add your address to continue using our services.</p>
              </div>
            )}
            
            <form onSubmit={handleAddressUpdate}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Street Address</label>
                <input 
                  type="text" 
                  value={addressData.street}
                  onChange={(e) => setAddressData({...addressData, street: e.target.value})}
                  placeholder="IIT Gandhinagar"
                  className="w-full p-2 border rounded"
                  required
                  autoFocus
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">City</label>
                  <input 
                    type="text" 
                    value={addressData.city}
                    onChange={(e) => setAddressData({...addressData, city: e.target.value})}
                    placeholder="Gandhinagar"
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">State</label>
                  <input 
                    type="text" 
                    value={addressData.state}
                    onChange={(e) => setAddressData({...addressData, state: e.target.value})}
                    placeholder="Gujarat"
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Pin Code</label>
                <input 
                  type="text" 
                  value={addressData.zipcode}
                  onChange={(e) => setAddressData({...addressData, zipcode: e.target.value})}
                  placeholder="382055"
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              
              <div className="flex justify-end gap-2">
                {!isNewUser && (
                  <button 
                    type="button" 
                    onClick={closeAddressModal}
                    className="px-4 py-2 border rounded"
                  >
                    Cancel
                  </button>
                )}
                <button 
                  type="submit"
                  disabled={updatingAddress}
                  className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-blue-300"
                >
                  {updatingAddress ? 'Updating...' : isNewUser ? 'Save Address' : 'Update Address'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Phone Update Modal */}
      {showPhoneModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={closePhoneModal}
          onKeyDown={(e) => {
            if (e.key === 'Escape') closePhoneModal();
          }}
        >
          <div 
            className="bg-white p-6 rounded-lg w-[450px] max-w-full"
            onClick={(e) => e.stopPropagation()} // Prevent clicks inside modal from closing it
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">{profile.customer_phone ? 'Update' : 'Add'} Phone Number</h3>
              <button 
                type="button"
                onClick={closePhoneModal}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handlePhoneUpdate}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Phone Number</label>
                <input 
                  type="tel" 
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Enter your phone number (optional)"
                  className="w-full p-2 border rounded"
                  autoFocus
                />
                <div className="text-xs text-gray-600 mt-2">
                  <p>Phone number is optional. Format: +91XXXXXXXXXX or 10-digit number</p>
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={closePhoneModal}
                  className="px-4 py-2 border rounded"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={updatingPhone}
                  className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-blue-300"
                >
                  {updatingPhone ? 'Updating...' : 'Update Phone'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 