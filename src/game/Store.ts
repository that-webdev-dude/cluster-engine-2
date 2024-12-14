import * as Cluster from "../cluster";

const state = {
  score: 100,
};

const actions = {
  incrementScore(store: Cluster.Store, payload: number) {
    store.commit("setScore", state.score + payload);
  },
  decrementScore(store: Cluster.Store, payload: number) {
    store.commit("setScore", state.score - payload);
  },
};

const getters = {
  score: (state: any) => state.score,
};

const mutations = {
  setScore(state: any, payload: number) {
    state.score = payload;
  },
};

export const Store = new Cluster.Store({
  state,
  actions,
  getters,
  mutations,
});
