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

export interface GameMenuEvent extends Cluster.Event {
  type: "game-menu";
}

export interface GameWinEvent extends Cluster.Event {
  type: "game-win";
}
