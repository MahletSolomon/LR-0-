import { Production, Symbol } from "@/type/grammar";

export type LR0Item = {
    prodId: number; // Refers to index in AugmentedGrammar.productions
    dot: number; // Position of the dot (0 to rhs.length)
};

export type LR0State = {
    id: string; // "S0", "S1", etc.
    items: LR0Item[]; // Closure-saturated item set
    signature: string; // Unique signature for deduplication
};

export type LR0Transition = {
    fromId: string;
    symbol: Symbol;
    toId: string;
};

export type AugmentedGrammar = {
    originalStartSymbol: Symbol;
    startPrime: Symbol;
    productions: Production[]; // 0 is S' -> S, rest are original (re-IDed)
    terminals: Set<Symbol>;
    nonTerminals: Set<Symbol>;
};

export type LR0Automaton = {
    grammar: AugmentedGrammar;
    states: LR0State[];
    transitions: LR0Transition[];
};
