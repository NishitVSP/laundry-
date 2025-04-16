'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminQueryPage() {
  const [query, setQuery] = useState('SELECT * FROM customers LIMIT 10');
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
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
    }
  }, [router]);

  const handleQuerySubmit = async (e) => {
    e.preventDefault();
    
    if (!query.trim()) {
      setError('Please enter a SQL query');
      return;
    }
    
    setLoading(true);
    setError('');
    setResults(null);
    
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch('http://localhost:4000/admin/query', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: query
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to execute query');
      }
      
      setResults(data);
    } catch (err) {
      console.error('Query execution failed:', err);
      setError(err.message || 'Failed to execute query');
    } finally {
      setLoading(false);
    }
  };

  // Function to render table from query results
  const renderResultsTable = () => {
    if (!results || !results.results || !results.results.length) {
      return <p className="text-gray-600 italic">No results returned from query.</p>;
    }
    
    const columns = Object.keys(results.results[0]);
    
    return (
      <div className="overflow-x-auto mt-4">
        <table className="min-w-full bg-white border border-gray-200">
          <thead className="bg-gray-100">
            <tr>
              {columns.map((column, index) => (
                <th key={index} className="px-4 py-2 text-left text-sm font-semibold text-gray-700 border-b">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.results.map((row, rowIndex) => (
              <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                {columns.map((column, colIndex) => (
                  <td key={colIndex} className="px-4 py-2 text-sm border-b">
                    {row[column] === null 
                      ? <span className="text-gray-400">NULL</span> 
                      : typeof row[column] === 'object'
                        ? JSON.stringify(row[column])
                        : String(row[column])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-sm text-gray-600">
          Total rows: {results.rowCount}
        </p>
      </div>
    );
  };

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
        <h1 className="text-2xl font-bold">Admin SQL Query Tool</h1>
        <Link href="/dashboard" className="text-blue-600 hover:underline">
          Back to Dashboard
        </Link>
      </div>

      <div className="bg-white shadow-md rounded-lg p-6">
        <form onSubmit={handleQuerySubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              SQL Query for cs432g10 Database
            </label>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full p-2 border rounded font-mono text-sm h-40"
              placeholder="Enter your SQL query here..."
            />
            
            <div className="text-xs text-gray-500 mt-1">
              <p>Tips:</p>
              <ul className="list-disc list-inside ml-2">
                <li>For security reasons, DROP, CREATE, ALTER, TRUNCATE, RENAME, DELETE, and UPDATE operations are blocked</li>
                <li>You can only perform read operations</li>
                <li>Example: <code className="bg-gray-100 px-1">SELECT * FROM customers LIMIT 10</code></li>
              </ul>
            </div>
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:bg-blue-300"
            >
              {loading ? 'Executing...' : 'Execute Query'}
            </button>
          </div>
        </form>
        
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
            <p className="font-medium">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}
        
        {results && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold mb-2">Query Results</h2>
            {renderResultsTable()}
          </div>
        )}
      </div>
    </div>
  );
} 