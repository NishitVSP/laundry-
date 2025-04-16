'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    username: '',
    email: '',
    dob: '',
    password: '',
    role: 'user',
    passkey: '', // newly added
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = { ...form };
    if (payload.role !== 'admin') delete payload.passkey; // remove if not needed

    try {
      console.log('Submitting signup form:', payload); // Debugging line
      const res = await fetch('http://localhost:4000/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        if (data['session token']) {
          localStorage.setItem('token', data['session token']);
          alert('Signup successful! Redirecting...');
          router.push('/dashboard');
        } else {
          alert('Signup successful, but no session token received. Please login manually.');
          router.push('/login');
        }
      } else {
        alert(data.error || 'Signup failed'); // show error from API
      }
    } catch (err) {
      console.error('Signup error:', err);
      alert('Something went wrong during signup');
    }
  };

  return (
    <div className="p-10 max-w-md mx-auto">
      <div className="flex justify-center mb-8">
        <div className="text-4xl font-bold bg-blue-600 text-white px-6 py-3 rounded-lg shadow-md select-none">
          <span className="mr-1">Fresh</span>
          <span className="text-blue-200">Wash</span>
          <span className="text-xs ml-1 align-top">™</span>
        </div>
      </div>
      
      <h1 className="text-2xl font-bold mb-4">Signup</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input name="username" placeholder="Username" value={form.username} onChange={handleChange} className="w-full p-2 border" />
        <input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} className="w-full p-2 border" />
        <input name="dob" type="date" value={form.dob} onChange={handleChange} className="w-full p-2 border" />
        <input name="password" type="password" placeholder="Password" value={form.password} onChange={handleChange} className="w-full p-2 border" />

        {/* Role Selector */}
        <select name="role" value={form.role} onChange={handleChange} className="w-full p-2 border">
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>

        {/* Conditionally show passkey field for Admin */}
        {form.role === 'admin' && (
          <input
            name="passkey"
            placeholder="Enter Admin Passkey"
            value={form.passkey}
            onChange={handleChange}
            className="w-full p-2 border"
          />
        )}

        <button type="submit" className="bg-blue-600 text-white p-2 w-full">Sign Up</button>
      </form>

      <p className="mt-4 text-sm">
        Already have an account?{' '}
        <Link href="/login" className="text-blue-500 underline">Login</Link>
      </p>
    </div>
  );
}