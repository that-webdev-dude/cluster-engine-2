import { Renderer } from "../../../cluster/gl/Renderer";
import { Mouse } from "../../../cluster/core/Input";

Mouse.element = Renderer.canvasElement();
Mouse.setVirtualSize(640, 384);

export { Mouse };
