/**
 * File: src/cluster/core/Emitter.ts
 *
 * Event emitter and pub/sub system for cluster-engine-2.
 *
 * Provides a flexible, type-safe event dispatch and listener registration system
 * with immediate (critical) and queued (batched) event delivery.
 * Supports once/off listeners, event queue flushing, and singleton access.
 *
 * Features:
 * - Type-safe event registration and emission
 * - Immediate (synchronous) and queued (asynchronous/batched) emitters
 * - Per-event and global listener removal
 * - Event queue flushing for deferred events
 * - Centralized singleton emitter for global event management
 */

/**
 * Generic type for event listeners, which accept an event payload.
 */
export type EventListener<T extends Event> = (event: T) => void;

/**
 * Interface for an event emitter implementation.
 */
interface Emitter {
    on<T extends Event>(eventType: string, listener: EventListener<T>): void;
    off<T extends Event>(eventType: string, listener: EventListener<T>): void;
    once<T extends Event>(eventType: string, listener: EventListener<T>): void;
    emit<T extends Event>(event: T): void;
    clear(): void;
    removeAllListeners(eventType?: string): void;
    eventNames(): string[];
}

/**
 * Base event interface.
 */
export interface Event {
    /** Type identifier for the event. */
    type: string;
    /** Optional event payload data. */
    data?: any;
}

/**
 * Synchronous event emitter.
 * Invokes listeners immediately when events are emitted.
 */
class ImmediateEmitter implements Emitter {
    private listeners: Map<string, EventListener<Event>[]> = new Map();

    on<T extends Event>(eventType: string, listener: EventListener<T>): void {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, []);
        }
        this.listeners.get(eventType)!.push(listener as EventListener<Event>);
    }

    once<T extends Event>(eventType: string, listener: EventListener<T>): void {
        const onceListener: EventListener<T> = (event) => {
            this.off(eventType, onceListener);
            listener(event);
        };
        this.on(eventType, onceListener);
    }

    off<T extends Event>(eventType: string, listener: EventListener<T>): void {
        this.removeListener(eventType, listener);
    }

    addListener<T extends Event>(
        eventType: string,
        listener: EventListener<T>
    ): void {
        this.on(eventType, listener);
    }

    removeListener<T extends Event>(
        eventType: string,
        listener: EventListener<T>
    ): void {
        const listeners = this.listeners.get(eventType);
        if (listeners) {
            const index = listeners.indexOf(listener as EventListener<Event>);
            if (index >= 0) {
                listeners.splice(index, 1);
            }
        }
    }

    emit<T extends Event>(event: T): void {
        const listeners = this.listeners.get(event.type);
        if (listeners) {
            // Copy to prevent modification during iteration
            [...listeners].forEach((listener) => listener(event));
        }
    }

    clear(): void {
        this.listeners.clear();
    }

    removeAllListeners(eventType?: string): void {
        if (eventType) {
            this.listeners.delete(eventType);
        } else {
            this.clear();
        }
    }

    eventNames(): string[] {
        return Array.from(this.listeners.keys());
    }
}

/**
 * Queued (asynchronous/batched) event emitter.
 * Events are queued on emit and delivered on flush().
 */
class QueuedEmitter implements Emitter {
    private listeners: Map<string, EventListener<Event>[]> = new Map();
    private queue: Event[] = [];

    on<T extends Event>(eventType: string, listener: EventListener<T>): void {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, []);
        }
        this.listeners.get(eventType)!.push(listener as EventListener<Event>);
    }

    once<T extends Event>(eventType: string, listener: EventListener<T>): void {
        const onceListener: EventListener<T> = (event) => {
            this.off(eventType, onceListener);
            listener(event);
        };
        this.on(eventType, onceListener);
    }

    off<T extends Event>(eventType: string, listener: EventListener<T>): void {
        this.removeListener(eventType, listener);
    }

    addListener<T extends Event>(
        eventType: string,
        listener: EventListener<T>
    ): void {
        this.on(eventType, listener);
    }

    removeListener<T extends Event>(
        eventType: string,
        listener: EventListener<T>
    ): void {
        const listeners = this.listeners.get(eventType);
        if (listeners) {
            const index = listeners.indexOf(listener as EventListener<Event>);
            if (index >= 0) {
                listeners.splice(index, 1);
            }
        }
    }

    emit<T extends Event>(event: T): void {
        this.queue.push(event);
    }

    /**
     * Delivers all queued events to their listeners.
     * Call this at the end of the update loop or frame.
     */
    flush(): void {
        while (this.queue.length > 0) {
            const event = this.queue.shift();
            if (event) {
                const listeners = this.listeners.get(event.type);
                if (listeners) {
                    [...listeners].forEach((listener) => listener(event));
                }
            }
        }
    }

    clear(): void {
        this.queue = [];
        this.listeners.clear();
    }

    removeAllListeners(eventType?: string): void {
        if (eventType) {
            this.listeners.delete(eventType);
        } else {
            this.clear();
        }
    }

    eventNames(): string[] {
        return Array.from(this.listeners.keys());
    }
}

/**
 * Singleton event emitter for the engine.
 * Provides a unified API with critical (immediate) and non-critical (queued) event channels.
 */
export class EventEmitter implements Emitter {
    private static instance: EventEmitter;
    private immediateEmitter: ImmediateEmitter = new ImmediateEmitter();
    private queuedEmitter: QueuedEmitter = new QueuedEmitter();

    /**
     * Returns the shared EventEmitter instance.
     */
    public static getInstance(): EventEmitter {
        if (!EventEmitter.instance) {
            EventEmitter.instance = new EventEmitter();
        }
        return EventEmitter.instance;
    }

    /**
     * Registers a listener for an event type.
     * @param eventType - The event type string.
     * @param listener - The callback for event delivery.
     * @param critical - If true, registers on immediate (critical) channel.
     */
    on<T extends Event>(
        eventType: string,
        listener: EventListener<T>,
        critical: boolean = false
    ): void {
        if (critical) {
            this.immediateEmitter.on(eventType, listener);
        } else {
            this.queuedEmitter.on(eventType, listener);
        }
    }

    /**
     * Registers a one-time listener for an event type.
     * @param eventType - The event type string.
     * @param listener - The callback for event delivery.
     * @param critical - If true, registers on immediate (critical) channel.
     */
    once<T extends Event>(
        eventType: string,
        listener: EventListener<T>,
        critical: boolean = false
    ): void {
        if (critical) {
            this.immediateEmitter.once(eventType, listener);
        } else {
            this.queuedEmitter.once(eventType, listener);
        }
    }

    /**
     * Removes a listener for an event type.
     * @param eventType - The event type string.
     * @param listener - The callback to remove.
     * @param critical - If true, removes from immediate (critical) channel.
     */
    off<T extends Event>(
        eventType: string,
        listener: EventListener<T>,
        critical: boolean = false
    ): void {
        if (critical) {
            this.immediateEmitter.off(eventType, listener);
        } else {
            this.queuedEmitter.off(eventType, listener);
        }
    }

    /**
     * Alias for on().
     */
    addListener<T extends Event>(
        eventType: string,
        listener: EventListener<T>,
        critical: boolean = false
    ): void {
        this.on(eventType, listener, critical);
    }

    /**
     * Alias for off().
     */
    removeListener<T extends Event>(
        eventType: string,
        listener: EventListener<T>,
        critical: boolean = false
    ): void {
        this.off(eventType, listener, critical);
    }

    /**
     * Emits an event to listeners.
     * @param event - The event to emit.
     * @param critical - If true, delivers immediately; otherwise queues for flush().
     */
    emit<T extends Event>(event: T, critical: boolean = false): void {
        if (critical) {
            this.immediateEmitter.emit(event);
        } else {
            this.queuedEmitter.emit(event);
        }
    }

    /**
     * Flushes the queued event channel, delivering all queued events.
     */
    flush(): void {
        this.queuedEmitter.flush();
    }

    /**
     * Clears all listeners and queued events from both channels.
     */
    clear(): void {
        this.immediateEmitter.clear();
        this.queuedEmitter.clear();
    }

    /**
     * Removes all listeners for a specific event type or for all events.
     * @param eventType - The event type string, or undefined for all.
     */
    removeAllListeners(eventType?: string): void {
        this.immediateEmitter.removeAllListeners(eventType);
        this.queuedEmitter.removeAllListeners(eventType);
    }

    /**
     * Returns the union of all registered event names.
     */
    eventNames(): string[] {
        return Array.from(
            new Set([
                ...this.immediateEmitter.eventNames(),
                ...this.queuedEmitter.eventNames(),
            ])
        );
    }
}

/**
 * Global singleton instance of the event emitter.
 * Import and use throughout the engine for event-driven communication.
 */
export const Emitter = EventEmitter.getInstance();
