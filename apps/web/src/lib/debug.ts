// Debug utility for tracking auth flow issues
export class AuthDebugger {
  private static logs: Array<{ timestamp: string; message: string; data?: unknown }> = [];
  
  static log(message: string, data?: unknown) {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, message, data };
    
    // Always log to console
    console.log(`[AuthDebug ${timestamp}] ${message}`, data || '');
    
    // Store in memory for later retrieval
    this.logs.push(logEntry);
    
    // Keep only last 50 entries to prevent memory issues
    if (this.logs.length > 50) {
      this.logs = this.logs.slice(-50);
    }
    
    // Also try to send to a simple endpoint for production debugging
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      try {
        fetch('/api/debug-log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(logEntry),
        }).catch(() => {
          // Silent fail if endpoint doesn't exist
        });
      } catch {
        // Silent fail
      }
    }
  }
  
  static getLogs() {
    return [...this.logs];
  }
  
  static clearLogs() {
    this.logs = [];
  }
  
  static exportLogs() {
    return JSON.stringify(this.logs, null, 2);
  }
}

// Environment detection utility
export const EnvUtils = {
  isProduction: () => typeof window !== 'undefined' && window.location.hostname !== 'localhost',
  isLocal: () => typeof window !== 'undefined' && window.location.hostname === 'localhost',
  getEnvironmentInfo: () => ({
    hostname: typeof window !== 'undefined' ? window.location.hostname : 'server',
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
    timestamp: new Date().toISOString(),
    url: typeof window !== 'undefined' ? window.location.href : 'server',
  }),
};
