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

// export interface GamePauseEvent extends Cluster.Event {
//   type: "game-pause";
// }

// export interface GameResumeEvent extends Cluster.Event {
//   type: "game-resume";
// }

// export interface GameRestartEvent extends Cluster.Event {
//   type: "game-restart";
// }

// export interface GameQuitEvent extends Cluster.Event {
//   type: "game-quit";
// }
