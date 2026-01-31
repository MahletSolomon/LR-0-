import { LR0Item, AugmentedGrammar } from "./types";
import { Symbol } from "@/type/grammar";

export function nextSymbol(aug: AugmentedGrammar, item: LR0Item): Symbol | null {
    const prod = aug.productions[item.prodId];
    if (!prod) return null; // Should not happen

    if (item.dot < prod.right.length) {
        return prod.right[item.dot];
    }
    return null;
}

export function advanceDot(item: LR0Item): LR0Item {
    return {
        prodId: item.prodId,
        dot: item.dot + 1,
    };
}

export function itemKey(item: LR0Item): string {
    return `${item.prodId}@${item.dot}`;
}

export function itemsSignature(items: LR0Item[]): string {
    return items
        .map(itemKey)
        .sort()
        .join("|");
}

export function itemToString(aug: AugmentedGrammar, item: LR0Item): string {
    const prod = aug.productions[item.prodId];
    if (!prod) return `[${item.prodId}@${item.dot}]`; // Fallback

    const beforeDot = prod.right.slice(0, item.dot).join(" ");
    const afterDot = prod.right.slice(item.dot).join(" ");

    // Use a nice bullet or similar
    const dotChar = "•";

    // Handle epsilon (empty RHS) specially? 
    // If rhs is empty, dot is 0. slice(0,0) is [], slice(0) is [].
    // We want to show "A -> •"

    const rhsStr = prod.right.length === 0
        ? dotChar
        : `${beforeDot} ${dotChar} ${afterDot}`.trim();

    return `${prod.left} -> ${rhsStr}`;
}
