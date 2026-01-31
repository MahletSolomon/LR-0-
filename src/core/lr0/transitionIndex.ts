import { LR0Automaton } from "./types";

// Map<fromStateId, Map<symbol, toStateId>>
export type TransitionLookup = Map<string, Map<string, string>>;

export function buildTransitionLookup(automaton: LR0Automaton): TransitionLookup {
    const lookup = new Map<string, Map<string, string>>();

    automaton.transitions.forEach((t) => {
        if (!lookup.has(t.fromId)) {
            lookup.set(t.fromId, new Map());
        }
        lookup.get(t.fromId)!.set(t.symbol, t.toId);
    });

    return lookup;
}
