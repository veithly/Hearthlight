/**
 * Polyfills for React Native compatibility with LangChain/LangGraph
 */

// Polyfill for AsyncLocalStorage
if (typeof global !== 'undefined' && !global.AsyncLocalStorage) {
  class AsyncLocalStoragePolyfill {
    private store = new Map();
    
    run(store: any, callback: () => any) {
      const oldStore = this.store;
      this.store = new Map(store);
      try {
        return callback();
      } finally {
        this.store = oldStore;
      }
    }
    
    getStore() {
      return this.store;
    }
    
    enterWith(store: any) {
      this.store = new Map(store);
    }
    
    exit(callback: () => any) {
      return callback();
    }
  }
  
  // Add to global scope
  (global as any).AsyncLocalStorage = AsyncLocalStoragePolyfill;
  
  // Also add to process if it exists
  if (typeof process !== 'undefined' && process.env) {
    (process as any).AsyncLocalStorage = AsyncLocalStoragePolyfill;
  }
}

// Polyfill for async_hooks if needed
if (typeof global !== 'undefined' && !global.async_hooks) {
  (global as any).async_hooks = {
    AsyncLocalStorage: (global as any).AsyncLocalStorage,
  };
}

// Export for explicit import
export const AsyncLocalStorage = (global as any).AsyncLocalStorage;
