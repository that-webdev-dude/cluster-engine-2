import { Store, Cmath } from "../../../cluster";
import type { State, Action, Mutation, Getter } from "../../../cluster";

const state: State = {
    appId: "#app",
    worldW: 832 * 2,
    worldH: 448 * 2,
    displayW: 832,
    displayH: 448,
    level: 0,
    scores: 0,
    lives: 5,
} as const;

const actions: Record<string, Action> = {
    incrementLevel(store, payload: number) {
        store.commit("setLevel", state.level + payload);
    },
    incrementScores(store, payload: number) {
        store.commit("setScores", state.scores + payload);
    },
    incrementLives(store, payload: number) {
        store.commit("setLives", state.lives + payload);
    },
    decrementLives(store, payload: number) {
        store.commit("setLives", state.lives - payload);
    },
    resetGame(store) {
        store.commit("setLevel", 0);
        store.commit("setScores", 0);
        store.commit("setLives", 5);
    },
};

const mutations: Record<string, Mutation> = {
    setLevel(state: any, payload: number) {
        state.level = payload;
    },
    setScores(state: any, payload: number) {
        state.scores = payload;
    },
    setLives(state: any, payload: number) {
        state.lives = Cmath.clamp(payload, 0, 5);
    },
};

const getters: Record<string, Getter> = {
    appId: (state: any) => state.appId,
    worldW: (state: any) => state.worldW,
    worldH: (state: any) => state.worldH,
    displayW: (state: any) => state.displayW,
    displayH: (state: any) => state.displayH,
    level: (state: any) => state.level,
    scores: (state: any) => state.scores,
    lives: (state: any) => state.lives,
} as const;

export default new Store({
    state,
    actions,
    mutations,
    getters,
});
