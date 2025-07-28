import { Emitter, Event } from "./Emitter";

/**
 * Internal status constants used to track the current Store operation type.
 */
const STATUS = {
    mutation: "mutation",
    resting: "resting",
    action: "action",
} as const;

/**
 * Type definition for a getter function.
 * A getter derives computed state from the base state.
 */
export type Getter = (state: State) => any;

/**
 * Type definition for a mutation function.
 * A mutation synchronously modifies the state.
 */
export type Mutation = (state: State, payload?: any) => void;

/**
 * Type definition for an action function.
 * An action may be asynchronous and can call multiple mutations and/or actions.
 */
export type Action = (store: Store, payload?: any) => void;

/**
 * Type definition for the store's state object.
 */
export type State = any;

/**
 * StoreOptions defines the structure for store initialization.
 */
export type StoreOptions = {
    /** Initial state object */
    state?: State;
    /** Map of action functions */
    actions?: {
        [key: string]: Action;
    };
    /** Map of getter functions */
    getters?: {
        [key: string]: (state: State) => any;
    };
    /** Map of mutation functions */
    mutations?: {
        [key: string]: Mutation;
    };
};

/**
 * StoreEvent is a type alias for events handled by the Store's emitter.
 */
export type StoreEvent = Event;

/**
 * StoreAction is a type alias for action functions.
 */
export type StoreAction = Action;

/**
 * The Store class is a centralized event-driven state management system.
 *
 * - Enforces state immutability except through mutations.
 * - Supports actions (which may be async or multi-step), mutations, and getters.
 * - Integrates with Emitter for event-driven workflows.
 * - Proxies state to restrict mutation and enforce mutation-only writes.
 */
export class Store {
    private emitter = Emitter;

    private _status: string = STATUS.resting;
    private _state: State;
    private _getters: Map<string, Getter>;
    private _actions: Map<string, Action>;
    private _mutations: Map<string, Mutation>;

    /**
     * Creates an instance of Store.
     * @param options - The options to initialize the store.
     */
    constructor(options: StoreOptions) {
        const {
            state = {},
            actions = {},
            getters = {},
            mutations = {},
        } = options;

        // Wrap state in a Proxy to enforce mutation/commit discipline
        this._state = new Proxy(state, {
            set: (state, key, value) => {
                if (!(key in state)) {
                    throw new Error(`The key "${String(key)}" is not declared`);
                }
                if (this._status !== STATUS.mutation) {
                    throw new Error(
                        `Use a mutation to set "${String(key)}" to "${value}"`
                    );
                }
                Reflect.set(state, key, value);
                // Optionally emit state change event here
                // this.emit({ type: "stateChange", data: this._state });
                this._status = STATUS.resting;
                return true;
            },
        });

        this._mutations = new Map(Object.entries(mutations));
        this._actions = new Map(Object.entries(actions));
        this._getters = new Map(Object.entries(getters));

        Object.seal(this);
    }

    /**
     * Dispatches an action by key.
     * Actions may be asynchronous or dispatch multiple mutations/actions.
     * @param actionKey - The key of the action to dispatch.
     * @param payload - The payload to pass to the action.
     * @returns True if the action was dispatched successfully.
     * @throws Error if the action does not exist.
     */
    dispatch(actionKey: string, payload?: any): boolean {
        const action = this._actions.get(actionKey);
        if (!action) {
            throw new Error(`Action ${actionKey} doesn't exist!`);
        }
        this._status = STATUS.action;
        action(this, payload);
        return true;
    }

    /**
     * Commits a mutation by key. Mutations are the only way to update state.
     * @param mutationKey - The key of the mutation to commit.
     * @param payload - The payload to pass to the mutation.
     * @returns True if the mutation was committed successfully.
     * @throws Error if the mutation does not exist.
     */
    commit(mutationKey: string, payload?: any): boolean {
        const mutation = this._mutations.get(mutationKey);
        if (!mutation) {
            throw new Error(`Mutation ${mutationKey} doesn't exist!`);
        }
        this._status = STATUS.mutation;
        mutation(this._state, payload);
        return true;
    }

    /**
     * Retrieves a computed value from a getter.
     * @param getterKey - The key of the getter to retrieve.
     * @returns The value returned by the getter.
     * @throws Error if the getter does not exist.
     */
    get(getterKey: string): any {
        const getter = this._getters.get(getterKey);
        if (!getter) {
            throw new Error(`Getter ${getterKey} doesn't exist!`);
        }
        return getter(this._state);
    }

    /**
     * Emits an event via the Store's event emitter.
     * @param event - The event object to emit.
     * @param critical - If true, emits immediately; otherwise, queues the event.
     */
    emit<T extends Event>(event: T, critical = false): void {
        this.emitter.emit(event, critical);
    }

    /**
     * Registers an event listener on the Store's emitter.
     * @param eventType - The event type string.
     * @param listener - The event listener callback.
     * @param critical - If true, registers with immediate (critical) delivery.
     */
    on<T extends Event>(
        eventType: string,
        listener: (event: T) => void,
        critical = false
    ): void {
        this.emitter.on(eventType, listener, critical);
    }

    /**
     * Flushes any queued (non-critical) events.
     */
    flush(): void {
        this.emitter.flush();
    }
}
