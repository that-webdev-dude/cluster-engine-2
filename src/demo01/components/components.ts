import { Component, ComponentSchema } from "../../cluster/ecs/Component";

export interface TransformSchema extends ComponentSchema {
  numericFields: ["x", "y"];
  nonNumericFields?: never[];
}
export interface Transform extends Component {
  x: number;
  y: number;
}

export interface VelocitySchema extends ComponentSchema {
  numericFields: ["vx", "vy"];
  nonNumericFields?: never[];
}
export interface Velocity extends Component {
  vx: number;
  vy: number;
}
