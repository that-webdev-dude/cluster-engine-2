# Cluster Engine 2

**Cluster Engine 2** is a lightweight, high-performance 2D game engine built in TypeScript, featuring a custom Entity-Component-System (ECS) architecture and GPU-accelerated rendering using WebGL2. It includes a complete demonstration game, _Xshooter_, showcasing gameplay mechanics, GUI systems, and scene transitions — all built using the engine’s core primitives.

> ⚙️ Designed for performance, modularity, and full control. Ideal for developers building retro-style games, experimental simulations, or WebGL-based visualisations.

![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/built_with-TypeScript-3178c6?logo=typescript&logoColor=white)
![WebGL2](https://img.shields.io/badge/rendering-WebGL2-orange)
![ECS](https://img.shields.io/badge/architecture-ECS-green)

---

## 🚀 Features

-   **⚡ Custom ECS Architecture**  
    Efficient, type-safe ECS design with chunked memory storage and archetype-driven entity composition.

-   **🧱 Structure-of-Arrays (SoA)**  
    Typed array component storage optimised for cache coherence and parallel iteration.

-   **🖥️ WebGL2 Rendering Pipeline**  
    Instanced rendering with custom GLSL shaders, vertex pipelines, and per-entity attributes.

-   **🧩 Modular Systems**  
    Clearly separated update and render systems that plug into `Scene` and `Game` lifecycles.

-   **🧠 Reactive Store & Events**  
    Vuex-style state management system with actions, mutations, getters, and event listeners.

-   **🧰 GUI Builder & Renderer**  
    Declarative UI with composable builders, hierarchical containers, and dynamic updates.

-   **🔊 Audio & Asset Management**  
    Runtime loader for textures, sounds, shaders, and fonts with on-demand asset caching.

-   **🕹️ Demo Game Included — Xshooter**  
    A fully playable space shooter that demonstrates the engine in action, including collision, camera shake, GUI, and level progression.

---

## 📁 Folder Structure

```
cluster-engine-2/
├── src/
│   ├── cluster/            → Core engine (ECS, WebGL, GUI, Input, Sound, Store)
│   ├── demos/xshooter/     → Demo game showcasing gameplay, systems, and GUI
│   ├── styles/             → SCSS styles used by the app
│   ├── images/             → Game asset sprites (e.g. characters, UI)
│   ├── fonts/              → Pixel fonts (e.g. Press Start 2P)
│   └── views/              → index.html entry point
├── typings/custom/         → TypeScript definitions for media and shader files
├── package.json            → Project dependencies and scripts
├── tsconfig.json           → TypeScript configuration
├── webpack.*.js            → Webpack configs for dev and production
└── README.md               → Project documentation (you’re here)
```

---

## 🕹️ Xshooter Demo

A self-contained game implemented entirely using the engine. Highlights include:

-   Instanced rendering of bullets and meteors
-   Player aiming and timed shooting
-   Procedural meteor spawns
-   Score, level, and life tracking via store
-   Reactive GUI using the GUI builder system
-   Scene switching between title, gameplay, and pause
-   Audio playback for music and effects
-   Event-driven architecture (e.g., bulletHit, playerHit, gamePause)

> To explore the code: see `src/demos/xshooter/app.ts`, `systems/`, `entities/`, and `scenes/`.

---

## 🧠 Core Concepts

### 🧱 Entity Component System

-   Entities are composed via **Archetypes**, defined by a tuple of component types.
-   Components are defined via **ComponentDescriptor** objects that map to typed arrays.
-   Systems are of two types:
    -   `StorageUpdateSystem`: runs per-frame logic over matching archetypes.
    -   `StorageRenderSystem`: runs rendering code, often sending data to GPU pipelines.

### 🎨 WebGL Rendering

-   WebGL2 used via `GPURenderingLayer` (in `Display.ts`)
-   Custom **Pipeline** classes manage shader programs, vertex formats, and draw calls.
-   Rendering is batched and per-instance attributes (position, color, rotation, etc.) are passed efficiently.

### 🧰 GUI System

-   GUI elements are created using builder functions like `createGUIText`, `createGUIRect`, etc.
-   GUIContainers can be composed recursively to form UI trees.
-   GUI systems traverse and update the UI tree and render onto an OffscreenCanvas using 2D APIs.

### 🧠 Store & Events

-   Inspired by Vuex. Define:
    -   **state**: reactive values like `score`, `level`, `lives`
    -   **actions**: named commands to mutate state
    -   **mutations**: atomic state transitions
    -   **getters**: derived reactive values
    -   **events**: message passing (e.g., `PlayerHitEvent`) between systems and GUI

---

## 🛠️ Getting Started

### Prerequisites

-   Node.js (≥18)
-   npm

### Install & Run

```bash
npm install
npm run dev
```

Open `http://localhost:8080` in your browser. The _Xshooter_ demo will load.

### Build for Production

```bash
npm run build
```

The app will be bundled and optimized into the `dist/` folder.

---

## 📦 Dependencies

-   [TypeScript](https://www.typescriptlang.org/) – Strong typing across ECS and engine
-   [Webpack](https://webpack.js.org/) – Dev and prod bundling
-   [Sass](https://sass-lang.com/) – For retro UI styling
-   [gl-matrix](http://glmatrix.net/) – (Optional) Vector math if needed
-   [Vitest](https://vitest.dev/) – Setup for future unit tests

---

## 🎯 Roadmap

Planned or suggested features:

-   [ ] Interactive GUI input (mouse/touch buttons, sliders)
-   [ ] Texture atlas and batcher
-   [ ] Physics system (AABB, swept collision)
-   [ ] Scene transition manager with animation
-   [ ] Full game template generator (CLI)
-   [ ] Documentation website

---

## 🧑‍💻 Author

**Fabio Barracano**  
GitHub: [@that-webdev-dude](https://github.com/that-webdev-dude)  
Made with ❤️ in London

---

## 📄 License

This project is licensed under the [MIT License](./LICENSE).

---

> For feedback, issues, or collaboration, feel free to open an issue or fork the repository.
