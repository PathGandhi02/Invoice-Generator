import { StorageService, type StorageAdapter } from './StorageService';

export const GUEST_PREFIX = 'gigainvoice:v2:guest:';
export const GUEST_CONTROL = `${GUEST_PREFIX}__control`;
export interface GuestAdapter extends StorageAdapter {
  getAllKeys(): Promise<readonly string[]>;
  removeItem(key: string): Promise<void>;
}
export type GuestState = { generation: string; resetting: boolean };
export class GuestDataChangedError extends Error {
  constructor() { super('Guest data was cleared in another window. Reopen this workspace before saving.'); }
}
type Lock = <T>(operation: () => Promise<T>) => Promise<T>;
type SyncAdapter = { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void };

/** Each mounted workspace keeps a fixed generation. Old forms can never write
 * into the new workspace, even if they resume after a tab/device suspension. */
export class GuestDataService {
  private pending: Promise<unknown> = Promise.resolve();
  private listeners = new Set<() => void>();
  constructor(private readonly adapter: GuestAdapter, private readonly lock: Lock = operation => operation(), private readonly sync?: SyncAdapter) {}
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  notify = () => { this.listeners.forEach(listener => listener()); };
  async current(): Promise<GuestState> {
    const raw = await this.adapter.getItem(GUEST_CONTROL);
    if (!raw) return { generation: 'initial', resetting: false };
    const state = JSON.parse(raw) as GuestState;
    if (!state || typeof state.generation !== 'string' || !/^[a-z0-9-]+$/.test(state.generation) || typeof state.resetting !== 'boolean') throw new Error('Guest reset status could not be read. Clear guest data to recover.');
    return state;
  }
  private exclusive<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.pending.catch(() => {}).then(() => this.lock(operation));
    this.pending = next.catch(() => {});
    return next;
  }
  private async assertCurrent(generation: string) {
    const current = await this.current();
    if (current.resetting || current.generation !== generation) { this.notify(); throw new GuestDataChangedError(); }
  }
  open(state: GuestState): StorageService {
    const generation = state.generation;
    const prefix = generation === 'initial' ? GUEST_PREFIX : `${GUEST_PREFIX}epoch:${generation}:`;
    return new StorageService({
      ...(this.sync ? { flushItem: (key: string, value: string) => {
        // Only the transient current draft uses a synchronous browser write.
        // There is no await between checking the reset lease and writing it.
        if (key !== `${prefix}draft`) throw new Error('Only the current draft can be flushed.');
        const check = () => {
          const raw = this.sync!.getItem(GUEST_CONTROL);
          const state = raw ? JSON.parse(raw) as GuestState : { generation: 'initial', resetting: false };
          if (state.generation !== generation || state.resetting !== false) throw new GuestDataChangedError();
        };
        check(); this.sync!.setItem(key, value);
        try { check(); } catch(error) { this.sync!.removeItem(key); this.notify(); throw error; }
      } } : {}),
      getItem: key => this.exclusive(async () => {
        await this.assertCurrent(generation);
        return this.adapter.getItem(key);
      }),
      setItem: (key, value) => this.exclusive(async () => {
        await this.assertCurrent(generation);
        await this.adapter.setItem(key, value);
        // Also fence browsers without Web Locks: a concurrent reset changes the
        // namespace, and a late old-generation write is removed, never reopened.
        try { await this.assertCurrent(generation); }
        catch (error) { await this.adapter.removeItem(key); throw error; }
      }),
      updateItem: (key, update) => this.exclusive(async () => {
        await this.assertCurrent(generation);
        const value = update(await this.adapter.getItem(key));
        await this.assertCurrent(generation);
        await this.adapter.setItem(key, value);
        try { await this.assertCurrent(generation); }
        catch (error) { await this.adapter.removeItem(key); throw error; }
      }),
    }, prefix);
  }
  clear(): Promise<void> {
    return this.exclusive(async () => {
      let previous: GuestState | undefined;
      try { previous = await this.current(); } catch { /* Confirmed reset can recover corrupt metadata. */ }
      const state: GuestState = previous?.resetting ? previous : {
        generation: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`, resetting: true,
      };
      // Durable intent first. Interrupted/partial deletion keeps the workspace
      // inaccessible until the user retries; startup never restores old data.
      await this.adapter.setItem(GUEST_CONTROL, JSON.stringify(state));
      this.notify();
      for (const key of await this.adapter.getAllKeys()) {
        const latest = await this.current();
        if (latest.generation !== state.generation || !latest.resetting) throw new GuestDataChangedError();
        if (key.startsWith(GUEST_PREFIX) && key !== GUEST_CONTROL) await this.adapter.removeItem(key);
      }
      const latest = await this.current();
      if (latest.generation !== state.generation || !latest.resetting) throw new GuestDataChangedError();
      await this.adapter.setItem(GUEST_CONTROL, JSON.stringify({ ...state, resetting: false }));
      this.notify();
    });
  }
}
