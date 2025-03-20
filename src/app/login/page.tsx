'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setCookie } from 'cookies-next';
import DebugKeyTester from './debug';

export default function Login() {
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [debug, setDebug] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (apiKey.trim() === '') {
      setError('Please enter your API key');
      setDebug(null);
      return;
    }
    
    setLoading(true);
    setError('');
    setDebug(null);
    
    try {
      // Encode the API key for safe transport
      const encodedApiKey = encodeURIComponent(apiKey.trim());
      
      // Simple verification
      const res = await fetch('/api/verify-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim() })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        // Store API key in a cookie (30 days expiry)
        // Use encodeURIComponent to handle special chars like + and =
        setCookie('api_key', encodedApiKey, { maxAge: 60 * 60 * 24 * 30 });
        router.push('/');
      } else {
        console.error('Verification failed:', data);
        setError('Invalid API key');
        
        // Set debug information if available
        if (data.debug) {
          setDebug(data.debug);
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred. Please try again.');
      setDebug(null);
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
            
            {debug && (
              <div className="mt-2 text-sm">
                <p>Debug Information:</p>
                <ul className="list-disc ml-5 mt-1">
                  <li>Input key length: {debug.inputKeyLength}</li>
                  <li>Expected key length: {debug.expectedKeyLength}</li>
                  <li>Input starts with: {debug.inputKeyStart}</li>
                  <li>Expected starts with: {debug.expectedKeyStart}</li>
                </ul>
              </div>
            )}
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
        
        {/* Debug Tool */}
        <DebugKeyTester />
      </div>
    </div>
  );
} 