// TODO:
// MouseInput.update() correctly zeroes out isPressed/isReleased each frame.
// For symmetry, you might want to do something similar in KeyboardInput.update() if you ever add one‐shot key events (e.g. keyDownOnce).
// As written, Keyboard.x()/y() stays true until the real keyup event—fine for continuous panning,
// but if you ever want to detect a single-press, you’d need to clear that. No change needed now,
// just something to keep in mind.

class KeyboardInput {
    private static _instance: KeyboardInput;
    private _keys: Map<string, boolean> = new Map();
    private _preventDefaultKeys: Set<string> = new Set([
        // Add specific keys here
    ]);

    private _onKeyDown = this._handleKeyDown.bind(this);
    private _onKeyUp = this._handleKeyUp.bind(this);

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

    public static getInstance(): KeyboardInput {
        if (!KeyboardInput._instance) {
            KeyboardInput._instance = new KeyboardInput();
        }
        return KeyboardInput._instance;
    }

    public key(key: string, value?: boolean): boolean {
        if (!this.active) return false;
        if (value !== undefined) {
            this._keys.set(key, value);
        }

        return this._keys.get(key) || false;
    }

    public x(): number {
        return (
            (Number(this.key("ArrowRight")) || Number(this.key("KeyD"))) -
            (Number(this.key("ArrowLeft")) || Number(this.key("KeyA")))
        );
    }

    public y(): number {
        return (
            (Number(this.key("ArrowDown")) || Number(this.key("KeyS"))) -
            (Number(this.key("ArrowUp")) || Number(this.key("KeyW")))
        );
    }

    public update(): void {
        // this._keys.clear();
    }

    public destroy(): void {
        document.removeEventListener("keydown", this._onKeyDown);
        document.removeEventListener("keyup", this._onKeyUp);
    }
}

export const Keyboard = KeyboardInput.getInstance();

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

    public static getInstance(container?: HTMLElement): MouseInput {
        if (!MouseInput.instance) {
            MouseInput.instance = new MouseInput(container);
        }
        return MouseInput.instance;
    }

    get position(): { x: number; y: number } {
        return { x: this._position.x, y: this._position.y };
    }

    get isDown(): boolean {
        return this._isDown;
    }

    get isPressed(): boolean {
        return this._isPressed;
    }

    get isReleased(): boolean {
        return this._isReleased;
    }

    get element(): HTMLElement {
        return this._element;
    }

    set element(container: HTMLElement) {
        this._element = container;
    }

    public setVirtualSize(w: number, h: number) {
        this._virtualWidth = w;
        this._virtualHeight = h;
    }

    get virtualPosition(): { x: number; y: number } {
        if (!(this._element instanceof HTMLCanvasElement)) {
            return { x: this._position.x, y: this._position.y };
        }

        return {
            x: (this._position.x / this._element.width) * this._virtualWidth,
            y: (this._position.y / this._element.height) * this._virtualHeight,
        };
    }

    private _getCurrentPosition({ clientX, clientY }: MouseEvent) {
        const rect = this._element.getBoundingClientRect();

        if (this._element instanceof HTMLCanvasElement) {
            const scaleX = this._element.width / rect.width;
            const scaleY = this._element.height / rect.height;

            this._position.x = (clientX - rect.left) * scaleX;
            this._position.y = (clientY - rect.top) * scaleY;
        } else {
            // Fallback for non-canvas elements (if ever used)
            this._position.x = clientX - rect.left;
            this._position.y = clientY - rect.top;
        }
    }

    private _move(e: MouseEvent) {
        this._getCurrentPosition(e);
    }

    private _down(e: MouseEvent) {
        this._isDown = true;
        this._isPressed = true;
        this._getCurrentPosition(e);
    }

    private _up(e: MouseEvent) {
        this._isDown = false;
        this._isReleased = true;
        this._getCurrentPosition(e);
    }

    public update() {
        this._isReleased = false;
        this._isPressed = false;
    }

    public destroy(): void {
        document.removeEventListener("contextmenu", this._onContextMenu);
        document.removeEventListener("mousemove", this._onMouseMove);
        document.removeEventListener("mousedown", this._onMouseDown);
        document.removeEventListener("mouseup", this._onMouseUp);
    }
}

export const Mouse = MouseInput.getInstance();
