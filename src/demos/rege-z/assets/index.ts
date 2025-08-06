import spritesheetImageURL from "./_spritesheet.png";
import { Assets } from "../../../cluster";
import { Spritesheet } from "../../../cluster";

const spritesheetImg = Assets.image(spritesheetImageURL);
const spritesheet = new Spritesheet(spritesheetImg, 7, 3); // 6 rows, 3 columns

export { spritesheetImg, spritesheet };
