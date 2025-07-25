import { Assets } from "../../../cluster";
import gameplaySoundURL from "./Gameplay.mp3";

export const gameplaySound = Assets.soundObject(gameplaySoundURL, {
    channel: "music",
    loop: true,
    volume: 0.8,
});
