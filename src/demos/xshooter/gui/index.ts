import {
    GUIContainer,
    createGUIText,
    withPosition,
    withText,
    withAlign,
    composeGUI,
    withTag,
    withAngle,
    withIndex,
    withFill,
    createGUIRect,
    withAlpha,
} from "../../../cluster/gui/GUIbuilders";
import { Cmath } from "../../../cluster/tools";
import { GLOBALS } from "../globals";
import { store } from "../stores";

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

    // game lives
    const GUILivesContainer = new GUIContainer({
        tag: "GUILivesContainer",
        position: {
            x: GLOBALS.worldW - 24,
            y: GLOBALS.worldH - 24,
        },
    });
    const storedLives = store.get("lives") || 3;
    for (let i = 0; i < storedLives; i++) {
        const GUILife = composeGUI(
            createGUIText("\u2665", '16px "Press Start 2P"', "white"),
            withPosition(-i * 24, -2),
            withAlign("center"),
            withAngle(Cmath.deg2rad(0)),
            withText("\u2665"),
            withFill("red"),
            withTag("GUILife"),
            withIndex(i + 1)
        );
        GUILivesContainer.add(GUILife);
    }

    // dump in the game container
    const GUIGameContainer = new GUIContainer();
    GUIGameContainer.add(GUIScoresContainer);
    GUIGameContainer.add(GUILevelContainer);
    GUIGameContainer.add(GUILivesContainer);
    GUIGameContainer.add(GUITimerText);

    return GUIGameContainer;
}

export function createGameTitleGUI(): GUIContainer {
    const GUITitleContainer = new GUIContainer();

    const GUITitleText = composeGUI(
        createGUIText("scores", '32px "Press Start 2P"', "white"),
        withPosition(GLOBALS.worldW / 2, GLOBALS.worldH / 2 - 24),
        withText("xshooter"),
        withAngle(Cmath.deg2rad(0))
    );

    const GUIActionText = composeGUI(
        createGUIText("scores", '14px "Press Start 2P"', "white"),
        withPosition(GLOBALS.worldW / 2, GLOBALS.worldH / 2 + 24),
        withText("press ENTER"),
        withAngle(Cmath.deg2rad(0))
    );

    GUITitleContainer.add(GUITitleText);
    GUITitleContainer.add(GUIActionText);

    return GUITitleContainer;
}

export function createPauseDialogGUI(): GUIContainer {
    const GUIDialogContainer = new GUIContainer({
        background: "red",
    });

    const GUIPauseFrame = composeGUI(
        createGUIRect(GLOBALS.worldW, GLOBALS.worldH, "red"),
        withPosition(0, 0),
        withAlpha(0.5)
    );

    const GUIPauseText = composeGUI(
        createGUIText("scores", '16px "Press Start 2P"', "white"),
        withPosition(GLOBALS.worldW / 2, GLOBALS.worldH / 2),
        withText("PAUSED")
    );

    GUIDialogContainer.add(GUIPauseFrame);
    GUIDialogContainer.add(GUIPauseText);

    return GUIDialogContainer;
}
