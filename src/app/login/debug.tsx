'use client';

import { useState } from 'react';

export default function DebugKeyTester() {
  const [apiKey, setApiKey] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  async function handleTest() {
    setLoading(true);
    setResult(null);
    
    try {
      const res = await fetch('/api/debug-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey })
      });
      
      const data = await res.json();
      setResult(data);
    } catch (error) {
      setResult({ error: String(error) });
    } finally {
      setLoading(false);
    }
  }
  
  return (
    <div className="mt-8 p-4 border border-gray-300 rounded-md">
      <h2 className="text-lg font-semibold">API Key Debugger</h2>
      <p className="text-sm text-gray-600 mb-4">
        Compare your API key directly with the server's expected value
      </p>
      
      <div className="flex space-x-2">
        <input
          type="text"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Enter API key to test"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
        />
        <button
          onClick={handleTest}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded-md disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Key'}
        </button>
      </div>
      
      {result && (
        <div className="mt-4 p-3 bg-gray-100 rounded-md text-sm font-mono overflow-auto">
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
} 