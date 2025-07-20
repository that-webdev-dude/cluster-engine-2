import { store } from "../stores";
import {
    GUIContainer,
    createGUIText,
    withPosition,
    withText,
    withAlign,
    composeGUI,
    withTag,
    withAngle,
} from "../../../cluster/gui/GUIbuilders";
import { GLOBALS } from "../globals";
import { Cmath } from "../../../cluster/tools";

export function createGamePlayGUI(): GUIContainer {
    // game scores
    const GUIScoresContainer = new GUIContainer();
    const GUIScoresText = composeGUI(
        createGUIText("SCORES", '16px "Press Start 2P"', "white"),
        withPosition(24, 24),
        withAlign("left")
    );
    const GUIScoresValue = composeGUI(
        createGUIText("0", '16px "Press Start 2P"', "white"),
        withPosition(132, 24),
        withAlign("left"),
        withText(() => store.get("scores") || "0")
    );
    GUIScoresContainer.add(GUIScoresText);
    GUIScoresContainer.add(GUIScoresValue);

    // game scores
    const GUILevelContainer = new GUIContainer();
    const GUILevelText = composeGUI(
        createGUIText("LEVEL", '16px "Press Start 2P"', "white"),
        withPosition(24, GLOBALS.worldH - 24),
        withAlign("left")
    );
    const GUILevelValue = composeGUI(
        createGUIText("0", '16px "Press Start 2P"', "white"),
        withPosition(132, GLOBALS.worldH - 24),
        withAlign("left"),
        withText(() => store.get("level") || "0")
    );
    GUILevelContainer.add(GUILevelText);
    GUILevelContainer.add(GUILevelValue);

    // game timer
    const GUITimerText = composeGUI(
        createGUIText("SCORES", '16px "Press Start 2P"', "white"),
        withPosition(GLOBALS.worldW / 2, 24),
        withText("0.0"),
        withTag("GUITimer")
    );

    const GUIGameContainer = new GUIContainer();
    GUIGameContainer.add(GUIScoresContainer);
    GUIGameContainer.add(GUILevelContainer);
    GUIGameContainer.add(GUITimerText);

    return GUIGameContainer;
}

export function createGameTitleGUI(): GUIContainer {
    const GUITitleText = composeGUI(
        createGUIText("scores", '16px "Press Start 2P"', "white"),
        withPosition(GLOBALS.worldW / 2, GLOBALS.worldH / 2),
        withText("xshooter"),
        withAngle(Cmath.deg2rad(0))
    );

    const GUITitleContainer = new GUIContainer();
    GUITitleContainer.add(GUITitleText);

    return GUITitleContainer;
}
