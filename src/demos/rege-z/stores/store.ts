import { Store } from "../../../cluster";
import type { State, Action, Mutation, Getter } from "../../../cluster";

const state: State = {
    appId: "#app",
    worldW: 800,
    worldH: 400,
} as const;

const actions: Record<string, Action> = {} as const;

const mutations: Record<string, Mutation> = {} as const;

const getters: Record<string, Getter> = {
    appId: (state: any) => state.appId,
    worldW: (state: any) => state.worldW,
    worldH: (state: any) => state.worldH,
} as const;

export default new Store({
    state,
    actions,
    mutations,
    getters,
});
