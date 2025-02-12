import { Scene } from "./Scene";
import { Display } from "../core/Display";
import { Engine } from "../core/Engine";
import { Assets } from "../core/Assets";
import { Store } from "../core/Store";
import { Mouse } from "../core/Input";
import { Keyboard } from "../core/Input";

Mouse.element = Display.view;

export class Game {
  private _currentScene: Scene | null;

  private _nextScene: Scene | null;

  private _switching: boolean = false;

  private _emitter: Store;

  constructor(emitter: Store) {
    this._currentScene = null;
    this._nextScene = null;
    this._switching = false;
    this._emitter = emitter;
  }

  get currentScene(): Scene | null {
    return this._currentScene;
  }

  get nextScene(): Scene | null {
    return this._nextScene;
  }

  setScene(scene: Scene): void {
    if (!this._currentScene) {
      this._currentScene = scene;
      return;
    }
    if (this._currentScene && !this._nextScene && !this._switching) {
      this._nextScene = scene;
      this._switching = true;
    }
  }

  start(callback: (dt: number, t: number) => void): void {
    Engine.update = (dt: number, t: number) => {
      Display.clear();

      // Update the current scene
      if (this._currentScene) {
        this._currentScene.update(dt, t);
      }

      // If switching, also update the next scene
      if (this._switching && this._nextScene) {
        this._nextScene.update(dt, t);

        // Check if the current scene is dead
        if (this._currentScene?.dead) {
          // Swap scenes
          this._currentScene = this._nextScene;
          this._nextScene = null;
          this._switching = false; // Reset the switching flag
        }
      }

      callback(dt, t);

      this._emitter.processEvents();

      Keyboard.update();
      Mouse.update();
    };

    Assets.onReady(() => {
      Engine.start();
    });
  }

  // TODO: Implement a stop method to clean up resources and stop the game loop.
  stop(): void {
    this._emitter.clear();
    Engine.stop(); // ... maybe some form of cleanup function here
  }
}
