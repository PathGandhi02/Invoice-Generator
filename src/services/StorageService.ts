export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  updateItem?(key: string, update: (value: string | null) => string): Promise<void>;
  flushItem?(key: string, value: string): void;
}

const queues = new WeakMap<StorageAdapter, Map<string, Promise<void>>>();
export class StorageService {
  private pending: Map<string, Promise<void>>;
  constructor(private readonly adapter: StorageAdapter, private readonly prefix = 'gigainvoice:v1:') {
    this.pending = queues.get(adapter) ?? new Map();
    queues.set(adapter, this.pending);
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.readSerialized(key);
    return value === null ? null : JSON.parse(value) as T;
  }

  async readSerialized(key: string): Promise<string | null> {
    await this.pending.get(`${this.prefix}${key}`);
    return this.adapter.getItem(`${this.prefix}${key}`);
  }

  set<T>(key: string, value: T): Promise<void> {
    const serialized = JSON.stringify(value);
    return this.enqueue(key, () => this.adapter.setItem(`${this.prefix}${key}`, serialized));
  }

  /** Page dismissal cannot wait for promises or browser locks. */
  flush<T>(key: string, value: T): boolean {
    if (!this.adapter.flushItem) return false;
    this.adapter.flushItem(`${this.prefix}${key}`, JSON.stringify(value));
    return true;
  }

  update(key: string, update: (serialized: string | null) => string): Promise<void> {
    const fullKey = `${this.prefix}${key}`;
    return this.enqueue(key, async () => {
      if (this.adapter.updateItem) return this.adapter.updateItem(fullKey, update);
      await this.adapter.setItem(fullKey, update(await this.adapter.getItem(fullKey)));
    });
  }

  private enqueue(key: string, write: () => Promise<void>): Promise<void> {
    key = `${this.prefix}${key}`;
    const operation = (this.pending.get(key) ?? Promise.resolve()).catch(() => {}).then(
      write,
    );
    this.pending.set(key, operation);
    void operation.finally(() => {
      if (this.pending.get(key) === operation) this.pending.delete(key);
    }).catch(() => {});
    return operation;
  }
}
