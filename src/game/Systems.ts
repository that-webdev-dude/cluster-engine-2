import * as Cluster from "../cluster";
import * as Globals from "./Globals";
import {
  PositionComponent,
  VelocityComponent,
  SizeComponent,
  StyleComponent,
  AlphaComponent,
  TextComponent,
  PlayerComponent,
  TransitionComponent,
} from "./Components";

/**
 * systems
 */
export class RendererSystem extends Cluster.System {
  ctx: CanvasRenderingContext2D;

  constructor() {
    super();
    const canvas = document.querySelector("canvas");
    if (!canvas) throw new Error("Canvas not found");

    this.ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  }

  update(entity: Cluster.Entity, dt: number, t: number) {
    if (entity.dead) return;

    const position =
      entity.getComponent<PositionComponent>("PositionComponent") || undefined;
    const alpha =
      entity.getComponent<AlphaComponent>("AlphaComponent") || undefined;

    this.ctx.save();

    if (alpha) {
      this.ctx.globalAlpha *= Cluster.Cmath.clamp(alpha.value, 0, 1);
    }

    if (position) {
      this.ctx.translate(position.x, position.y);
    }

    // render rectangle
    const size =
      entity.getComponent<SizeComponent>("SizeComponent") || undefined;
    const style =
      entity.getComponent<StyleComponent>("StyleComponent") || undefined;

    if (size && style) {
      this.ctx.fillStyle = style.fill;
      this.ctx.strokeStyle = style.stroke;
      this.ctx.strokeRect(0, 0, size.width, size.height);
      this.ctx.fillRect(0, 0, size.width, size.height);
    }

    // render text
    const text =
      entity.getComponent<TextComponent>("TextComponent") || undefined;

    if (text) {
      this.ctx.textAlign = text.align;
      this.ctx.font = text.font;
      this.ctx.fillStyle = text.fill;
      this.ctx.fillText(text.value, 0, 0);
    }

    if (entity.children.size > 0) {
      entity.children.forEach((child) => {
        this.update(child, dt, t);
      });
    }

    this.ctx.restore();
  }
}

export class TransitionSystem extends Cluster.System {
  update(entity: Cluster.Entity, dt: number, t: number) {
    const transition =
      entity.getComponent<TransitionComponent>("TransitionComponent") ||
      undefined;

    if (!transition) return;

    entity.active = false; // deactivate entity during transition

    if (transition.method === "fadeIn") {
      transition.elapsed += dt;
      transition.progress = transition.elapsed / transition.duration;

      const alpha = entity.getComponent<AlphaComponent>("AlphaComponent");
      if (alpha) alpha.value = transition.progress;

      if (transition.progress >= 1) {
        entity.removeComponent("TransitionComponent");
        entity.active = true; // activate entity after transition
        entity.dead = false;
      }
    }

    if (transition.method === "fadeOut") {
      transition.elapsed += dt;
      transition.progress = transition.elapsed / transition.duration;

      const alpha = entity.getComponent<AlphaComponent>("AlphaComponent");
      if (alpha) alpha.value = 1 - transition.progress;

      if (transition.progress >= 1) {
        entity.removeComponent("TransitionComponent");
        entity.active = true; // activate entity after transition
        entity.dead = true;
      }
    }
  }
}

export class PlayerSystem extends Cluster.System {
  update(entity: Cluster.Entity, dt: number, t: number) {
    if (entity.dead || !entity.active) return;

    // just move the player up and down for now. bounce on screen when player touches the edge.
    const player = entity.getComponent<PlayerComponent>("PlayerComponent");

    if (player) {
      const position =
        entity.getComponent<PositionComponent>("PositionComponent");
      const velocity =
        entity.getComponent<VelocityComponent>("VelocityComponent");
      const size = entity.getComponent<SizeComponent>("SizeComponent");

      if (position && velocity && size) {
        position.y += velocity.y * dt;

        if (position.y < 0) {
          position.y = 0;
          velocity.y = -velocity.y;
        }

        if (position.y + size.height > Globals.DISPLAY.height) {
          position.y = Globals.DISPLAY.height - size.height;
          velocity.y = -velocity.y;
        }
      }
    }

    entity.children.forEach((child) => {
      this.update(child, dt, t);
    });
  }
}
