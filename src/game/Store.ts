import * as Cluster from "../cluster";

type Getter = (state: State) => any;
type Mutation = (state: State, payload?: any) => void;
type Action = (store: Cluster.Store, payload?: any) => void;
type State = any;

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
  score: (state: State) => state.score,
};

const mutations = {
  setScore(state: State, payload: number) {
    state.score = payload;
  },
};

export const Store = new Cluster.Store({
  state,
  actions,
  getters,
  mutations,
});
