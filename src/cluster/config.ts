export interface EngineConfig {
  world: {
    width: number;
    height: number;
  };
  viewport: {
    width: number;
    height: number;
  };
}

export const config: EngineConfig = {
  world: {
    width: 1280,
    height: 768,
  },
  viewport: {
    width: 640,
    height: 384,
  },
};
