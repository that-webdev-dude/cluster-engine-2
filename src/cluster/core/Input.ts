/**
 * File: src/cluster/core/Input.ts
 *
 * Unified keyboard and mouse input management for cluster-engine-2.
 *
 * Provides singleton interfaces for keyboard and mouse input polling, supporting
 * per-frame queries for pressed, released, and held state. Designed for real-time
 * games and interactive applications, with high-DPI and canvas coordinate support.
 *
 * Features:
 * - Singleton pattern for Keyboard and Mouse input
 * - Polling API for key and mouse button states (down, pressed, released)
 * - Scalable virtual coordinates for mouse (useful for fixed-resolution games)
 * - Easy integration with canvas or other DOM elements
 * - Extensible for one-shot key events or additional input devices
 *
 * TODO:
 * - MouseInput.update() correctly zeroes out isPressed/isReleased each frame.
 *   For symmetry, you might want to do something similar in KeyboardInput.update()
 *   if you ever add one‐shot key events (e.g. keyDownOnce).
 *   As written, Keyboard.x()/y() stays true until the real keyup event—fine for
 *   continuous panning, but if you ever want to detect a single-press, you’d
 *   need to clear that. No change needed now, just something to keep in mind.
 */

/**
 * Keyboard input manager.
 * Tracks key up/down states, supports polling for axis values, and allows
 * registration for specific keys to prevent browser defaults.
 */
class KeyboardInput {
    private static _instance: KeyboardInput;
    private _keys: Map<string, boolean> = new Map();
    private _preventDefaultKeys: Set<string> = new Set([
        // Add specific keys here to prevent default browser behavior
    ]);

    private _onKeyDown = this._handleKeyDown.bind(this);
    private _onKeyUp = this._handleKeyUp.bind(this);

    /** If false, disables all key input. */
    public active: boolean = true;

    private constructor() {
        document.addEventListener("keydown", this._onKeyDown);
        document.addEventListener("keyup", this._onKeyUp);
    }

    private _handleKeyDown(e: KeyboardEvent): void {
        if (this._preventDefaultKeys.has(e.code)) {
            e.preventDefault();
        }
        this._keys.set(e.code, true);
    }

    private _handleKeyUp(e: KeyboardEvent): void {
        if (!this.active) this.active = true;
        if (this._preventDefaultKeys.has(e.code)) {
            e.preventDefault();
        }
        this._keys.set(e.code, false);
    }

    /**
     * Returns the singleton KeyboardInput instance.
     */
    public static getInstance(): KeyboardInput {
        if (!KeyboardInput._instance) {
            KeyboardInput._instance = new KeyboardInput();
        }
        return KeyboardInput._instance;
    }

    /**
     * Queries or sets the state of a key.
     * @param key - KeyboardEvent.code (e.g. "ArrowLeft", "KeyA")
     * @param value - If provided, sets the key state.
     * @returns True if the key is currently held down.
     */
    public key(key: string, value?: boolean): boolean {
        if (!this.active) return false;
        if (value !== undefined) {
            this._keys.set(key, value);
        }
        return this._keys.get(key) || false;
    }

    /**
     * Returns horizontal axis: +1 for right/D, -1 for left/A, 0 for none.
     */
    public x(): number {
        return (
            (Number(this.key("ArrowRight")) || Number(this.key("KeyD"))) -
            (Number(this.key("ArrowLeft")) || Number(this.key("KeyA")))
        );
    }

    /**
     * Returns vertical axis: +1 for down/S, -1 for up/W, 0 for none.
     */
    public y(): number {
        return (
            (Number(this.key("ArrowDown")) || Number(this.key("KeyS"))) -
            (Number(this.key("ArrowUp")) || Number(this.key("KeyW")))
        );
    }

    /**
     * Called at end of frame to clear one-shot key events (not needed for current design).
     */
    public update(): void {
        // this._keys.clear();
    }

    /**
     * Removes event listeners and cleans up.
     */
    public destroy(): void {
        document.removeEventListener("keydown", this._onKeyDown);
        document.removeEventListener("keyup", this._onKeyUp);
    }
}

/**
 * Mouse input manager.
 * Tracks mouse position, pressed, released, and held state, and supports
 * translation to a virtual coordinate system (for fixed-resolution games).
 */
class MouseInput {
    private static instance: MouseInput;
    private _element: HTMLElement;
    private _position: { x: number; y: number };
    private _isDown: boolean;
    private _isPressed: boolean;
    private _isReleased: boolean;
    private _virtualWidth = 640;
    private _virtualHeight = 384;

    private _onContextMenu = (e: Event) => e.preventDefault();
    private _onMouseMove = (e: MouseEvent) => this._move(e);
    private _onMouseDown = (e: MouseEvent) => this._down(e);
    private _onMouseUp = (e: MouseEvent) => this._up(e);

    /**
     * MouseInput is a singleton. Use MouseInput.getInstance().
     * @param container - The element to use as the mouse reference frame.
     */
    private constructor(container: HTMLElement = document.body) {
        this._element = container;
        this._position = { x: 0, y: 0 };
        this._isDown = false;
        this._isPressed = false;
        this._isReleased = false;

        document.addEventListener("contextmenu", this._onContextMenu);
        document.addEventListener("mousemove", this._onMouseMove);
        document.addEventListener("mousedown", this._onMouseDown);
        document.addEventListener("mouseup", this._onMouseUp);
    }

    /**
     * Returns the singleton MouseInput instance.
     * @param container - The element to use as the mouse reference frame.
     */
    public static getInstance(container?: HTMLElement): MouseInput {
        if (!MouseInput.instance) {
            MouseInput.instance = new MouseInput(container);
        }
        return MouseInput.instance;
    }

    /** Returns the current mouse position in pixels relative to the element. */
    get position(): { x: number; y: number } {
        return { x: this._position.x, y: this._position.y };
    }

    /** True if mouse is currently held down. */
    get isDown(): boolean {
        return this._isDown;
    }

    /** True if mouse was pressed this frame. */
    get isPressed(): boolean {
        return this._isPressed;
    }

    /** True if mouse was released this frame. */
    get isReleased(): boolean {
        return this._isReleased;
    }

    /** The DOM element used for relative mouse coordinates. */
    get element(): HTMLElement {
        return this._element;
    }

    set element(container: HTMLElement) {
        this._element = container;
    }

    /**
     * Sets the virtual coordinate system size for mouse translation.
     * @param w - Width in game/virtual units.
     * @param h - Height in game/virtual units.
     */
    public setVirtualSize(w: number, h: number) {
        this._virtualWidth = w;
        this._virtualHeight = h;
    }

    /**
     * Returns the mouse position in the virtual coordinate system.
     */
    get virtualPosition(): { x: number; y: number } {
        if (!(this._element instanceof HTMLCanvasElement)) {
            return { x: this._position.x, y: this._position.y };
        }
        return {
            x: (this._position.x / this._element.width) * this._virtualWidth,
            y: (this._position.y / this._element.height) * this._virtualHeight,
        };
    }

    /**
     * Updates mouse position based on a MouseEvent.
     */
    private _getCurrentPosition({ clientX, clientY }: MouseEvent) {
        const rect = this._element.getBoundingClientRect();

        if (this._element instanceof HTMLCanvasElement) {
            const scaleX = this._element.width / rect.width;
            const scaleY = this._element.height / rect.height;

            this._position.x = (clientX - rect.left) * scaleX;
            this._position.y = (clientY - rect.top) * scaleY;
        } else {
            // Fallback for non-canvas elements
            this._position.x = clientX - rect.left;
            this._position.y = clientY - rect.top;
        }
    }

    /**
     * Mouse move handler.
     */
    private _move(e: MouseEvent) {
        this._getCurrentPosition(e);
    }

    /**
     * Mouse button down handler.
     */
    private _down(e: MouseEvent) {
        this._isDown = true;
        this._isPressed = true;
        this._getCurrentPosition(e);
    }

    /**
     * Mouse button up handler.
     */
    private _up(e: MouseEvent) {
        this._isDown = false;
        this._isReleased = true;
        this._getCurrentPosition(e);
    }

    /**
     * Call at end of each frame to clear isPressed/isReleased.
     * This ensures one-shot events only last for a single frame.
     */
    public update() {
        this._isReleased = false;
        this._isPressed = false;
    }

    /**
     * Cleans up and removes all mouse event listeners.
     */
    public destroy(): void {
        document.removeEventListener("contextmenu", this._onContextMenu);
        document.removeEventListener("mousemove", this._onMouseMove);
        document.removeEventListener("mousedown", this._onMouseDown);
        document.removeEventListener("mouseup", this._onMouseUp);
    }
}

/**
 * Singleton instance for keyboard input.
 */
export const Keyboard = KeyboardInput.getInstance();

/**
 * Singleton instance for mouse input.
 */
export const Mouse = MouseInput.getInstance();

/**
 * Unified global input object.
 * @example
 *   Input.Keyboard.key("Space")
 *   Input.Mouse.position
 */
export const Input = { Keyboard, Mouse };
