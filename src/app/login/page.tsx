'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setCookie } from 'cookies-next';

export default function Login() {
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (apiKey.trim() === '') {
      setError('Please enter your API key');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Encode the API key for safe transport
      const encodedApiKey = encodeURIComponent(apiKey.trim());
      
      // Verify API key
      const res = await fetch('/api/verify-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim() })
      });
      
      if (res.ok) {
        // Store API key in a cookie (30 days expiry)
        setCookie('api_key', encodedApiKey, { maxAge: 60 * 60 * 24 * 30 });
        router.push('/');
      } else {
        setError('Invalid API key');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }
  
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Login</h1>
          <p className="mt-2 text-gray-600">Enter your API key to access the application</p>
        </div>
        
        {error && (
          <div className="p-4 text-red-700 bg-red-100 rounded-md">
            <p className="font-bold">{error}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700">
              API Key
            </label>
            <input
              id="apiKey"
              name="apiKey"
              type="text"
              autoComplete="off"
              required
              className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
          
          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Log in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 