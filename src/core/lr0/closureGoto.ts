import { LR0Item, AugmentedGrammar } from "./types";
import { advanceDot, itemKey, nextSymbol } from "./items";
import { Symbol } from "@/type/grammar";

/**
 * Computes the closure of a set of items.
 * 
 * J = I 
 * repeat
 *   for each item A -> alpha . B beta in J
 *     for each production B -> gamma in G
 *       add B -> . gamma to J
 * until no more items can be added
 */
export function closure(aug: AugmentedGrammar, items: LR0Item[]): LR0Item[] {
    // Use a map for quick lookup and deduplication: key -> item
    const closureMap = new Map<string, LR0Item>();
    const queue: LR0Item[] = [];

    // Initialize
    items.forEach(item => {
        const key = itemKey(item);
        if (!closureMap.has(key)) {
            closureMap.set(key, item);
            queue.push(item);
        }
    });

    // Pre-index productions by LHS for performance: LHS -> [prodId, prodId...]
    const prodsByLhs = new Map<Symbol, number[]>();
    aug.productions.forEach(p => {
        if (!prodsByLhs.has(p.left)) {
            prodsByLhs.set(p.left, []);
        }
        prodsByLhs.get(p.left)!.push(p.id);
    });

    while (queue.length > 0) {
        const currentCallbackItem = queue.shift()!;
        const B = nextSymbol(aug, currentCallbackItem);

        // If next symbol is a non-terminal, expand it
        if (B && aug.nonTerminals.has(B)) {
            const prodIds = prodsByLhs.get(B) || [];
            prodIds.forEach(prodId => {
                // New item: B -> . gamma (dot is 0)
                const newItem: LR0Item = { prodId, dot: 0 };
                const key = itemKey(newItem);

                if (!closureMap.has(key)) {
                    closureMap.set(key, newItem);
                    queue.push(newItem);
                }
            });
        }
    }

    // Return items sorted by prodId, loop for deterministic output
    return Array.from(closureMap.values()).sort((a, b) => {
        if (a.prodId !== b.prodId) return a.prodId - b.prodId;
        return a.dot - b.dot;
    });
}

/**
 * Computes goto(I, X)
 * 
 * goto(I, X) = closure({ A -> alpha X . beta | A -> alpha . X beta in I })
 */
export function gotoSet(aug: AugmentedGrammar, items: LR0Item[], symbol: Symbol): LR0Item[] {
    const movedItems: LR0Item[] = [];

    for (const item of items) {
        const next = nextSymbol(aug, item);
        if (next === symbol) {
            movedItems.push(advanceDot(item));
        }
    }

    if (movedItems.length === 0) {
        return [];
    }

    return closure(aug, movedItems);
}
