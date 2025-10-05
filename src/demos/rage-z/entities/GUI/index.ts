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
    Cmath,
} from "../../../../cluster";
import store from "../../stores/store";

const displayW = store.get("displayW");
const displayH = store.get("displayH");

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
        withPosition(24, displayH - 24),
        withAlign("left")
    );
    const GUILevelValue = composeGUI(
        createGUIText("0", '16px "Press Start 2P"', "white"),
        withPosition(132, displayH - 24),
        withAlign("left"),
        withText(() => store.get("level") || "0")
    );
    GUILevelContainer.add(GUILevelText);
    GUILevelContainer.add(GUILevelValue);

    // game timer
    const GUITimerText = composeGUI(
        createGUIText("SCORES", '16px "Press Start 2P"', "white"),
        withPosition(displayW / 2, 24),
        withText("0.0"),
        withTag("GUITimer")
    );

    // game lives
    const GUILivesContainer = new GUIContainer({
        tag: "GUILivesContainer",
        position: {
            x: displayW - 24,
            y: displayH - 24,
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

    const GUIRect = composeGUI(
        createGUIRect(displayW, displayH, "black"),
        withPosition(0, 0),
        withAlpha(0.75)
    );

    const GUITitleText = composeGUI(
        createGUIText("scores", '32px "Press Start 2P"', "red"),
        withPosition(displayW / 2, displayH / 2 - 24),
        withText("RAGE-Z"),
        withAngle(Cmath.deg2rad(0))
    );

    const GUIActionText = composeGUI(
        createGUIText("scores", '14px "Press Start 2P"', "red"),
        withPosition(displayW / 2, displayH / 2 + 24),
        withText("press ENTER"),
        withAngle(Cmath.deg2rad(0))
    );

    GUITitleContainer.add(GUIRect);
    GUITitleContainer.add(GUITitleText);
    GUITitleContainer.add(GUIActionText);

    return GUITitleContainer;
}

export function createPauseDialogGUI(): GUIContainer {
    const GUIDialogContainer = new GUIContainer({
        background: "red",
    });

    const GUIPauseFrame = composeGUI(
        createGUIRect(displayW, displayH, "red"),
        withPosition(0, 0),
        withAlpha(0.5)
    );

    const GUIPauseText = composeGUI(
        createGUIText("scores", '16px "Press Start 2P"', "white"),
        withPosition(displayW / 2, displayH / 2),
        withText("PAUSED")
    );

    GUIDialogContainer.add(GUIPauseFrame);
    GUIDialogContainer.add(GUIPauseText);

    return GUIDialogContainer;
}
