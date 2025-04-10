
// laundrymanagement\dbfront\src\app\signup\page.jsx

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
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch('http://localhost:4000/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.token) {
          localStorage.setItem('token', data.token);
          alert('Signup successful! Redirecting to dashboard...');
          router.push('/dashboard');
        } else {
          alert('Signup successful, but no token received. Please login manually.');
          router.push('/login');
        }
      } else {
        alert(data.error || 'Signup failed');
      }
    } catch (err) {
      console.error('Signup error:', err);
      alert('Something went wrong');
    }
  };

  return (
    <div className="p-10 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Signup</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          name="username"
          placeholder="Username"
          value={form.username}
          onChange={handleChange}
          className="w-full p-2 border"
        />
        <input
          name="email"
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={handleChange}
          className="w-full p-2 border"
        />
        <input
          name="dob"
          type="date"
          value={form.dob}
          onChange={handleChange}
          className="w-full p-2 border"
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          className="w-full p-2 border"
        />

        {/* ✅ Role Selector */}
        <select
          name="role"
          value={form.role}
          onChange={handleChange}
          className="w-full p-2 border"
        >
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>

        <button type="submit" className="bg-blue-600 text-white p-2 w-full">
          Sign Up
        </button>
      </form>

      <p className="mt-4 text-sm">
        Already have an account?{' '}
        <Link href="/login" className="text-blue-500 underline">Login</Link>
      </p>
    </div>
  );
}
