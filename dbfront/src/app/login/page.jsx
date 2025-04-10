'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';

import Link from 'next/link';
let baseurl ="http://localhost:4000"
export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log(form);



    const res = await fetch(`${baseurl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    const data = await res.json();
console.log(data)


    if (res.ok) {
      localStorage.setItem('token', data.token); // Store JWT token
      let token = localStorage.getItem("token");
      const decoded = await jwtDecode(token);
      console.log(decoded);
    //   alert('Login successful!');
    //   router.push('/dashboard');
    } else {
      alert(data.error || 'Login failed');
    }
  };

  return (
    <div className="p-10 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Login</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input name="email" placeholder="Email" onChange={handleChange} className="w-full p-2 border" />
        <input name="password" type="password" placeholder="Password" onChange={handleChange} className="w-full p-2 border" />
        <button type="submit" className="bg-green-600 text-white p-2 w-full">Login</button>
      </form>
      <p className="mt-4 text-sm">
        Don't have an account?{' '}
        <Link href="/signup" className="text-blue-500 underline">Sign up</Link>
      </p>
    </div>
  );
}
