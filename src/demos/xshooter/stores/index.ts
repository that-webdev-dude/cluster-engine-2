import { Store } from "../../../cluster/core/Store";
import { Cmath } from "../../../cluster/tools";

const state = {
    level: 0,
    scores: 0,
    lives: 3,
};

const actions = {
    incrementLevel(store: Store, payload: number) {
        store.commit("setLevel", state.level + payload);
    },
    incrementScores(store: Store, payload: number) {
        store.commit("setScores", state.scores + payload);
    },
    incrementLives(store: Store, payload: number) {
        store.commit("setLives", state.lives + payload);
    },
    decrementLives(store: Store, payload: number) {
        store.commit("setLives", state.lives - payload);
    },
    resetGame(store: Store) {
        store.commit("setLevel", 0);
        store.commit("setScores", 0);
    },
};

const mutations = {
    setLevel(state: any, payload: number) {
        state.level = payload;
    },
    setScores(state: any, payload: number) {
        state.scores = payload;
    },
    setLives(state: any, payload: number) {
        state.lives = Cmath.clamp(payload, 0, 3);
    },
};

const getters = {
    level: (state: any) => state.level,
    scores: (state: any) => state.scores,
    lives: (state: any) => state.lives,
};

export const store = new Store({
    state,
    actions,
    mutations,
    getters,
});
