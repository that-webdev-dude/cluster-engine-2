import { Store } from "../../../cluster/core/Store";

const state = {
    level: 0,
    scores: 0,
};

const actions = {
    incrementLevel(store: Store, payload: number) {
        store.commit("setLevel", state.level + payload);
    },
    incrementScores(store: Store, payload: number) {
        store.commit("setScores", state.scores + payload);
    },
};

const mutations = {
    setLevel(state: any, payload: number) {
        state.level = payload;
    },
    setScores(state: any, payload: number) {
        state.scores = payload;
    },
};

const getters = {
    level: (state: any) => state.level,
    scores: (state: any) => state.scores,
};

export const store = new Store({
    state,
    actions,
    mutations,
    getters,
});
