import { Display } from "./cluster/core/Display";
import { Assets } from "./cluster/core/Assets";
import { RendererV3 } from "./cluster/renderer/RendererV3";

export default () => {
  const display = new Display({
    parentID: "#app",
    width: 600,
    height: 400,
  });

  const gl = display.view.getContext("webgl2", {
    antialias: false,
    alpha: false,
    depth: false,
    stencil: false,
  });
  if (!gl) throw new Error("WebGL2 not supported");
  const renderer = new RendererV3(gl);

  display.resizeCb = (width, height) => {
    renderer.resize(width, height);
    console.log(
      "resize",
      renderer.width,
      renderer.height,
      display.width,
      display.height
    );
  };
};
