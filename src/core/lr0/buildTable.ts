import { LR0Automaton, LR0State, LR0Item } from "./types";
import { LR0ParseTable, ActionEntry, Conflict } from "./tableTypes";
import { buildTransitionLookup } from "./transitionIndex";
import { itemToString } from "./items";

export function buildLR0ParseTable(automaton: LR0Automaton): LR0ParseTable {
    const { states, grammar } = automaton;
    const transitions = buildTransitionLookup(automaton);

    const action = new Map<string, Map<string, ActionEntry>>();
    const goto = new Map<string, Map<string, string>>();
    const conflicts: Conflict[] = [];

    // Helper to resolve or record conflicts
    function setAction(stateId: string, symbol: string, incoming: ActionEntry, incomingItem: LR0Item) {
        if (!action.has(stateId)) {
            action.set(stateId, new Map());
        }
        const row = action.get(stateId)!;
        const existing = row.get(symbol);

        if (existing) {
            // Conflict
            if (
                (existing.type === "shift" && incoming.type === "shift" && existing.to === (incoming as any).to) ||
                (existing.type === "reduce" && incoming.type === "reduce" && existing.prodId === (incoming as any).prodId) ||
                (existing.type === "accept" && incoming.type === "accept")
            ) {
                // Same action, ignore
                return;
            }

            // Determine existing provenance? (We assume just the last one conflicts)
            // Ideally we track provenance for existing entries too. 
            // For simplicity in this milestone, we re-find the item that justifies existing.
            // But we don't have it easily. 
            // We'll just assume conflict and list *possible* causes from state items.

            const kind =
                (existing.type === "shift" && incoming.type === "reduce") || (existing.type === "reduce" && incoming.type === "shift")
                    ? "shift/reduce"
                    : "reduce/reduce";

            // Heuristic to find causing items for existing action:
            let existingItems: string[] = [];
            const state = states.find(s => s.id === stateId)!;

            // Re-scan state items to guess what caused 'existing'
            state.items.forEach(item => {
                if (existing.type === "shift") {
                    // Shift comes from transition. Provenance is items with dot before 'symbol'.
                    const next = grammar.productions[item.prodId].right[item.dot];
                    if (next === symbol) existingItems.push(itemToString(grammar, item));
                } else if (existing.type === "reduce") {
                    if (item.prodId === existing.prodId && item.dot === grammar.productions[item.prodId].right.length) {
                        existingItems.push(itemToString(grammar, item));
                    }
                } else if (existing.type === "accept") {
                    if (item.prodId === 0 && item.dot === 1) existingItems.push(itemToString(grammar, item));
                }
            });

            const incomingStr = itemToString(grammar, incomingItem);

            conflicts.push({
                stateId,
                symbol,
                existing,
                incoming,
                kind: kind as any,
                causedBy: {
                    existingItems,
                    incomingItems: [incomingStr]
                }
            });
            // Do not overwrite existing (classic preference: shift > reduce, or first reduce)
            // But actually, we should probably keep existing.
        } else {
            row.set(symbol, incoming);
        }
    }

    // Iterate all states
    states.forEach((state) => {
        const trans = transitions.get(state.id);

        // 1. Shift Actions & GOTO
        if (trans) {
            trans.forEach((toStateId, symbol) => {
                if (grammar.terminals.has(symbol)) {
                    // SHIFT
                    // Provenance? All items where next symbol is 'symbol'
                    const causingItem = state.items.find(item => {
                        const right = grammar.productions[item.prodId].right;
                        return item.dot < right.length && right[item.dot] === symbol;
                    });
                    if (causingItem) {
                        setAction(state.id, symbol, { type: "shift", to: toStateId }, causingItem);
                    }
                } else if (grammar.nonTerminals.has(symbol) && symbol !== grammar.startPrime) {
                    // GOTO
                    if (!goto.has(state.id)) goto.set(state.id, new Map());
                    goto.get(state.id)!.set(symbol, toStateId);
                }
            });
        }

        // 2. Reduce & Accept Actions
        state.items.forEach(item => {
            const prod = grammar.productions[item.prodId];

            // Accept: S' -> S .
            if (prod.left === grammar.startPrime && item.dot === prod.right.length) {
                setAction(state.id, "$", { type: "accept" }, item);
                return;
            }

            // Reduce: A -> alpha .
            if (item.dot === prod.right.length) {
                // LR(0) reduces on ALL terminals + $
                const reduceTargets = [...grammar.terminals, "$"];
                reduceTargets.forEach(term => {
                    setAction(state.id, term, { type: "reduce", prodId: prod.id }, item);
                });
            }
        });

    });

    return {
        action,
        goto,
        conflicts,
        isLR0: conflicts.length === 0
    };
}
