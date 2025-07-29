import charactersImageURL from "./_characters.png";
import spritesheetImageURL from "./_spritesheet.png";
import { Assets } from "../../../cluster";

const charactersImg = Assets.image(charactersImageURL);
const spritesheetImg = Assets.image(spritesheetImageURL);

export { charactersImg, spritesheetImg };
