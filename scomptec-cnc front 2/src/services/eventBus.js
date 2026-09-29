class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(event, callback) {
    const listeners = this.listeners.get(event) || new Set();
    listeners.add(callback);
    this.listeners.set(event, listeners);
    return () => listeners.delete(callback);
  }

  emit(event, payload) {
    this.listeners.get(event)?.forEach((callback) => callback(payload));
  }
}

export const monitoringEvents = new EventBus();

