import { Store } from "../../../cluster";
import type { State, Action, Mutation, Getter } from "../../../cluster";

const state: State = {
    appId: "#app",
    worldW: 832,
    worldH: 448,
    displayW: 832,
    displayH: 448,
} as const;

const actions: Record<string, Action> = {} as const;

const mutations: Record<string, Mutation> = {} as const;

const getters: Record<string, Getter> = {
    appId: (state: any) => state.appId,
    worldW: (state: any) => state.worldW,
    worldH: (state: any) => state.worldH,
    displayW: (state: any) => state.displayW,
    displayH: (state: any) => state.displayH,
} as const;

export default new Store({
    state,
    actions,
    mutations,
    getters,
});
