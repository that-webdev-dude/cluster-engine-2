import { Vector } from "../tools/Vector";

class KeyboardInput {
  private _keys: Map<string, boolean> = new Map();
  private _preventDefaultKeys: Set<string> = new Set([
    // Add specific keys here
  ]);
  private static _instance: KeyboardInput;

  public active: boolean = true;

  private constructor() {
    document.addEventListener("keydown", this._handleKeyDown.bind(this));
    document.addEventListener("keyup", this._handleKeyUp.bind(this));
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
    this._keys.clear();
  }

  public destroy(): void {
    document.removeEventListener("keydown", this._handleKeyDown.bind(this));
    document.removeEventListener("keyup", this._handleKeyUp.bind(this));
  }
}

export const Keyboard = KeyboardInput.getInstance();

class MouseInput {
  private static instance: MouseInput;
  private _element: HTMLElement;
  private _position: Vector;
  private _isDown: boolean;
  private _isPressed: boolean;
  private _isReleased: boolean;

  private constructor(container: HTMLElement = document.body) {
    this._element = container;
    this._position = new Vector();
    this._isDown = false;
    this._isPressed = false;
    this._isReleased = false;

    document.addEventListener("contextmenu", (e: Event) => e.preventDefault());
    document.addEventListener("mousemove", (e: MouseEvent) => this._move(e));
    document.addEventListener("mousedown", (e: MouseEvent) => this._down(e));
    document.addEventListener("mouseup", (e: MouseEvent) => this._up(e));
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

  private _getCurrentPosition({
    clientX,
    clientY,
  }: {
    clientX: number;
    clientY: number;
  }) {
    const { _element, _position } = this;
    const rect = _element.getBoundingClientRect();
    const xRatio = _element.clientWidth
      ? _element.offsetWidth / _element.clientWidth
      : 0;
    const yRatio = _element.clientHeight
      ? _element.offsetHeight / _element.clientHeight
      : 0;
    _position.x = (clientX - rect.left) * xRatio;
    _position.y = (clientY - rect.top) * yRatio;
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
    document.removeEventListener("contextmenu", (e: Event) =>
      e.preventDefault()
    );
    document.removeEventListener("mousemove", (e: MouseEvent) => this._move(e));
    document.removeEventListener("mousedown", (e: MouseEvent) => this._down(e));
    document.removeEventListener("mouseup", (e: MouseEvent) => this._up(e));
  }
}

export const Mouse = MouseInput.getInstance();
