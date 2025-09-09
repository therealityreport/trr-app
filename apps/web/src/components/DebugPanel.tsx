"use client";

import { useState } from "react";
import { AuthDebugger } from "@/lib/debug";

export default function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<Array<{ timestamp: string; message: string; data?: unknown }>>([]);

  const refreshLogs = () => {
    setLogs(AuthDebugger.getLogs());
  };

  const clearLogs = () => {
    AuthDebugger.clearLogs();
    setLogs([]);
  };

  const exportLogs = () => {
    const logsText = AuthDebugger.exportLogs();
    const blob = new Blob([logsText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auth-debug-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => {
          setIsOpen(true);
          refreshLogs();
        }}
        className="fixed bottom-4 right-4 bg-red-600 text-white px-3 py-1 rounded text-xs font-mono z-50"
      >
        DEBUG
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-4 rounded-lg max-w-md max-h-96 overflow-auto z-50 text-xs font-mono">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold">Auth Debug Logs</h3>
        <button 
          onClick={() => setIsOpen(false)}
          className="text-red-400 hover:text-red-300"
        >
          ×
        </button>
      </div>
      
      <div className="flex gap-2 mb-2">
        <button 
          onClick={refreshLogs}
          className="bg-blue-600 px-2 py-1 rounded text-xs"
        >
          Refresh
        </button>
        <button 
          onClick={clearLogs}
          className="bg-yellow-600 px-2 py-1 rounded text-xs"
        >
          Clear
        </button>
        <button 
          onClick={exportLogs}
          className="bg-green-600 px-2 py-1 rounded text-xs"
        >
          Export
        </button>
      </div>

      <div className="bg-gray-900 p-2 rounded max-h-64 overflow-auto">
        {logs.length === 0 ? (
          <div className="text-gray-400">No logs yet</div>
        ) : (
          logs.slice(-20).map((log, i) => (
            <div key={i} className="mb-1 pb-1 border-b border-gray-700 last:border-b-0">
              <div className="text-green-400 text-xs">
                {new Date(log.timestamp).toLocaleTimeString()}
              </div>
              <div className="text-white break-words">{log.message}</div>
              {log.data !== undefined && (
                <div className="text-gray-300 text-xs mt-1">
                  <pre className="whitespace-pre-wrap">
                    {String(typeof log.data === 'string' ? log.data : JSON.stringify(log.data, null, 2))}
                  </pre>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
