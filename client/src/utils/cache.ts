// Simple in-memory cache with TTL and localStorage persistence
export class Cache<T> {
  private memCache = new Map<string, { data: T; timestamp: number }>();
  private ttl: number;
  private storageKey: string;

  constructor(storageKey: string, ttlMs: number = 5 * 60 * 1000) {
    this.storageKey = storageKey;
    this.ttl = ttlMs;
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        Object.entries(parsed).forEach(([key, value]: [string, unknown]) => {
          if (value && typeof value === 'object' && 'data' in value && 'timestamp' in value) {
            this.memCache.set(key, value as { data: T; timestamp: number });
          }
        });
      }
    } catch (e: unknown) {
      console.error('Failed to load cache from storage:', e);
    }
  }

  private saveToStorage(): void {
    try {
      const obj = Object.fromEntries(this.memCache.entries());
      localStorage.setItem(this.storageKey, JSON.stringify(obj));
    } catch (e: unknown) {
      console.error('Failed to save cache to storage:', e);
    }
  }

  get(key: string): T | null {
    const entry = this.memCache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > this.ttl) {
      this.memCache.delete(key);
      this.saveToStorage();
      return null;
    }
    
    return entry.data;
  }

  set(key: string, data: T): void {
    this.memCache.set(key, { data, timestamp: Date.now() });
    this.saveToStorage();
  }

  has(key: string): boolean {
    const entry = this.memCache.get(key);
    if (!entry) return false;
    
    if (Date.now() - entry.timestamp > this.ttl) {
      this.memCache.delete(key);
      this.saveToStorage();
      return false;
    }
    
    return true;
  }

  delete(key: string): void {
    this.memCache.delete(key);
    this.saveToStorage();
  }

  clear(): void {
    this.memCache.clear();
    localStorage.removeItem(this.storageKey);
  }
}

// Global caches for Jira data - persist to localStorage
export const jiraHeadingsCache = new Cache<string>('jiraHeadingsCache', 30 * 60 * 1000); // 30 minutes
export const jiraWorklogsCache = new Cache<unknown>('jiraWorklogsCache', 10 * 60 * 1000); // 10 minutes