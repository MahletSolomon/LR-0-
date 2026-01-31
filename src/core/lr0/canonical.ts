import { Grammar } from "@/type/grammar";
import { LR0Automaton, LR0State, LR0Transition } from "./types";
import { augmentGrammar } from "./augment";
import { closure, gotoSet } from "./closureGoto";
import { itemsSignature, nextSymbol } from "./items";

export type LR0BuildResult = {
    automaton?: LR0Automaton;
    errors: string[];
};

export function buildLR0Automaton(grammar: Grammar): LR0BuildResult {
    // 0. Validation
    if (!grammar.startSymbol) {
        return { errors: ["Grammar has no start symbol"] };
    }
    if (grammar.productions.length === 0) {
        return { errors: ["Grammar has no productions"] };
    }

    // 1. Augment
    const augmented = augmentGrammar(grammar);

    // 2. Initial State
    // S' -> . S  (prodId 0, dot 0)
    const initialItem = { prodId: 0, dot: 0 };
    const initialItems = closure(augmented, [initialItem]);

    const initialState: LR0State = {
        id: "S0",
        items: initialItems,
        signature: itemsSignature(initialItems),
    };

    const states: LR0State[] = [initialState];
    const transitions: LR0Transition[] = [];

    const stateBySignature = new Map<string, LR0State>();
    stateBySignature.set(initialState.signature, initialState);

    const queue: LR0State[] = [initialState];
    let stateIdCounter = 1;

    while (queue.length > 0) {
        const currentState = queue.shift()!;

        // Collect all unique transitions symbols
        // Symbols appearing immediately after dot
        const symbols = new Set<string>();
        currentState.items.forEach(item => {
            const sym = nextSymbol(augmented, item);
            if (sym) {
                symbols.add(sym);
            }
        });

        // Compute goto for each symbol
        for (const sym of symbols) {
            const nextItems = gotoSet(augmented, currentState.items, sym);

            if (nextItems.length === 0) continue;

            const signature = itemsSignature(nextItems);
            let nextState = stateBySignature.get(signature);

            // If new state, create and queue
            if (!nextState) {
                nextState = {
                    id: `S${stateIdCounter++}`,
                    items: nextItems,
                    signature: signature,
                };
                states.push(nextState);
                stateBySignature.set(signature, nextState);
                queue.push(nextState);
            }

            // Add transition
            transitions.push({
                fromId: currentState.id,
                symbol: sym,
                toId: nextState.id,
            });
        }
    }

    return {
        automaton: {
            grammar: augmented,
            states,
            transitions,
        },
        errors: [],
    };
}
