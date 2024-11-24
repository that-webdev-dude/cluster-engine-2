import * as Cluster from "../cluster";

/**
 * events
 */
export interface GamePlayEvent extends Cluster.Event {
  type: "game-play";
}

export interface GameOverEvent extends Cluster.Event {
  type: "game-over";
}
