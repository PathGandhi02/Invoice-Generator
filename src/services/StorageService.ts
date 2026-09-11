export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export class StorageService {
  private pending = new Map<string, Promise<void>>();
  constructor(private readonly adapter: StorageAdapter) {}

  async get<T>(key: string): Promise<T | null> {
    await this.pending.get(key);
    const value = await this.adapter.getItem(`gigainvoice:v1:${key}`);
    return value === null ? null : JSON.parse(value) as T;
  }

  set<T>(key: string, value: T): Promise<void> {
    const serialized = JSON.stringify(value);
    const operation = (this.pending.get(key) ?? Promise.resolve()).catch(() => {}).then(
      () => this.adapter.setItem(`gigainvoice:v1:${key}`, serialized),
    );
    this.pending.set(key, operation);
    void operation.finally(() => {
      if (this.pending.get(key) === operation) this.pending.delete(key);
    }).catch(() => {});
    return operation;
  }
}
