// ============================================================================
//  DO NOT MODIFY.
// ============================================================================
type AnyListener = (...args: any[]) => void;

export class EventManager {
  private listeners: Record<string, AnyListener[]> = {};

  subscribe(event: string, cb: AnyListener): void {
    (this.listeners[event] ??= []).push(cb);
  }

  unsubscribe(event: string, cb: AnyListener): void {
    const list = this.listeners[event];
    if (!list) return;
    const i = list.indexOf(cb);
    if (i !== -1) list.splice(i, 1);
  }

  dispatch(event: string, ...args: any[]): void {
    const list = this.listeners[event];
    if (!list) return;
    for (const cb of list.slice()) cb(...args);
  }
}
