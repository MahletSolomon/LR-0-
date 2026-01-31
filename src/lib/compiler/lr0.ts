import { Grammar, Production, Symbol } from "./grammar";

// --- Types ---

export interface LR0Item {
    prodId: number;
    dot: number;
}

export interface LR0State {
    id: string; // "S0", "S1"...
    items: LR0Item[];
    // We explicitly store the signature to make checking easier later
    signature: string;
}

export interface LR0Transition {
    from: string;
    symbol: Symbol;
    to: string;
}

export interface AugmentedGrammar extends Grammar {
    originalStart: Symbol;
    startPrime: Symbol;
}

// Table types
export type ActionType = "shift" | "reduce" | "accept";

export interface Action {
    type: ActionType;
    // For shift
    toState?: string;
    // For reduce
    prodId?: number;
}

// We need to track conflicts for the assignment/project
export interface Conflict {
    stateId: string;
    symbol: string;
    type: "shift/reduce" | "reduce/reduce";
    // Just keeping descriptions for UI
    msg: string;
}

export interface ParseTable {
    actions: Map<string, Map<string, Action>>; // state -> symbol -> Action
    goto: Map<string, Map<string, string>>;    // state -> nonTerminal -> stateID
    conflicts: Conflict[];
}

// --- Helpers ---

// returns the symbol after the dot, or null if dot is at end
function nextSymbol(grammar: Grammar, item: LR0Item): Symbol | null {
    const prod = grammar.productions[item.prodId];
    if (item.dot < prod.right.length) {
        return prod.right[item.dot];
    }
    return null;
}

// Moves dot one step forward
function advance(item: LR0Item): LR0Item {
    return { prodId: item.prodId, dot: item.dot + 1 };
}

// Unique string for a set of items (entry key for states map)
function getSignature(items: LR0Item[]): string {
    // Sort by ID then Dot to ensure uniqueness
    return items
        .map(i => `${i.prodId}:${i.dot}`)
        .sort()
        .join("|");
}

// Pretty print item for debugging/UI
export function formatItem(grammar: Grammar, item: LR0Item): string {
    const p = grammar.productions[item.prodId];
    const rhs = [...p.right];
    // Insert dot
    if (rhs.length === 0) {
        // Epsilon
        return `${p.left} -> •`;
    }

    const pre = rhs.slice(0, item.dot).join(" ");
    const post = rhs.slice(item.dot).join(" ");
    return `${p.left} -> ${pre} • ${post}`.trim();
}

// --- Core Algorithms ---

// Step 1: Augment the Grammar (Dragon Book algorithm)
// We add S' -> S
export function augment(g: Grammar): AugmentedGrammar {
    const startPrime = g.startSymbol + "'";

    // production 0 is the augmented one
    const startProd: Production = {
        id: 0,
        left: startPrime,
        right: [g.startSymbol],
        raw: `${startPrime} -> ${g.startSymbol}`
    };

    // Re-id existing productions to start from 1
    const newProds = g.productions.map((p, i) => ({ ...p, id: i + 1 }));

    const allProds = [startProd, ...newProds];

    const newNonTerminals = new Set(g.nonTerminals);
    newNonTerminals.add(startPrime);

    return {
        startSymbol: startPrime, // S' is the new start
        originalStart: g.startSymbol,
        startPrime: startPrime,
        nonTerminals: newNonTerminals,
        terminals: g.terminals,
        productions: allProds
    };
}

// Step 2: Closure
// Calculate the closure of a set of items
function closure(g: Grammar, items: LR0Item[]): LR0Item[] {
    const result = [...items];
    const resultSet = new Set(items.map(i => `${i.prodId}:${i.dot}`));
    const queue = [...items];

    while (queue.length > 0) {
        const current = queue.shift()!;
        const B = nextSymbol(g, current);

        // If B is a non-terminal, add productions B -> . gamma
        if (B && g.nonTerminals.has(B)) {
            // Find all productions starting with B
            g.productions.forEach(p => {
                if (p.left === B) {
                    const newItem: LR0Item = { prodId: p.id, dot: 0 };
                    const key = `${newItem.prodId}:${newItem.dot}`;

                    if (!resultSet.has(key)) {
                        resultSet.add(key);
                        result.push(newItem);
                        queue.push(newItem);
                    }
                }
            });
        }
    }

    // Return sorted for consistency
    return result.sort((a, b) => a.prodId - b.prodId || a.dot - b.dot);
}

// Step 3: Goto
// Calculate goto(I, X)
function goto(g: Grammar, items: LR0Item[], symbol: Symbol): LR0Item[] {
    const toMove: LR0Item[] = [];

    for (const item of items) {
        if (nextSymbol(g, item) === symbol) {
            toMove.push(advance(item));
        }
    }

    if (toMove.length === 0) return [];
    return closure(g, toMove);
}

// Step 4: Canonical Collection
// Build the full DFA of LR(0) items
export function buildAutomaton(rawGrammar: Grammar) {
    // Always augment first
    const grammar = augment(rawGrammar);

    // Initial state: closure({ S' -> . S })
    const startItem: LR0Item = { prodId: 0, dot: 0 };
    const startItems = closure(grammar, [startItem]);

    const s0: LR0State = {
        id: "S0",
        items: startItems,
        signature: getSignature(startItems)
    };

    const states: LR0State[] = [s0];
    const transitions: LR0Transition[] = [];

    // Keep track of states by signature to avoid duplicates
    const stateMap = new Map<string, string>(); // signature -> id
    stateMap.set(s0.signature, s0.id);

    const queue = [s0];
    let stateIdCounter = 1;

    while (queue.length > 0) {
        const currentState = queue.shift()!;

        // Find all possible transition symbols
        const symbols = new Set<Symbol>();
        currentState.items.forEach(i => {
            const sym = nextSymbol(grammar, i);
            if (sym) symbols.add(sym);
        });

        // Create transitions
        symbols.forEach(sym => {
            const nextItems = goto(grammar, currentState.items, sym);
            if (nextItems.length === 0) return;

            const sig = getSignature(nextItems);
            let nextStateId = stateMap.get(sig);

            if (!nextStateId) {
                // New state found!
                nextStateId = `S${stateIdCounter++}`;
                const newState: LR0State = {
                    id: nextStateId,
                    items: nextItems,
                    signature: sig
                };
                states.push(newState);
                stateMap.set(sig, nextStateId);
                queue.push(newState);
            }

            transitions.push({
                from: currentState.id,
                symbol: sym,
                to: nextStateId!
            });
        });
    }

    return { grammar, states, transitions };
}

// Step 5: Parse Table & Conflicts
export function buildTable(grammar: AugmentedGrammar, states: LR0State[], transitions: LR0Transition[]): ParseTable {
    const actions = new Map<string, Map<string, Action>>();
    const gotoTable = new Map<string, Map<string, string>>();
    const conflicts: Conflict[] = [];

    // Helper to add action and check/log conflicts
    const addAction = (state: string, sym: string, act: Action) => {
        if (!actions.has(state)) actions.set(state, new Map());
        const row = actions.get(state)!;

        if (row.has(sym)) {
            const existing = row.get(sym)!;
            // Simple duplicate check
            if (existing.type === act.type && existing.toState === act.toState && existing.prodId === act.prodId) {
                return; // Exact same action, ignore
            }

            // Conflict found
            conflicts.push({
                stateId: state,
                symbol: sym,
                type: (existing.type === "shift" || act.type === "shift") ? "shift/reduce" : "reduce/reduce",
                msg: `Conflict between ${existing.type} and ${act.type}`
            });
            // We keep the existing one (usually shift or first reduce)
            return;
        }

        row.set(sym, act);
    };

    // 1. Shift and Goto from transitions
    transitions.forEach(t => {
        if (grammar.terminals.has(t.symbol)) {
            addAction(t.from, t.symbol, { type: "shift", toState: t.to });
        } else {
            // Goto is deterministic in theory, but we store it
            if (!gotoTable.has(t.from)) gotoTable.set(t.from, new Map());
            gotoTable.get(t.from)!.set(t.symbol, t.to);
        }
    });

    // 2. Reduce and Accept
    states.forEach(state => {
        state.items.forEach(item => {
            // Check for dot at end (Reductions)
            const prod = grammar.productions[item.prodId];
            if (item.dot === prod.right.length) {

                if (prod.left === grammar.startPrime) {
                    // Accept: S' -> S .
                    addAction(state.id, "$", { type: "accept" });
                } else {
                    // Reduce: A -> alpha .
                    // LR(0) does reduce for *every* terminal + $
                    // (SLR would check Follow(A), but this is LR0)
                    const targets = [...grammar.terminals, "$"];
                    targets.forEach(t => {
                        addAction(state.id, t, { type: "reduce", prodId: prod.id });
                    });
                }
            }
        });
    });

    return { actions, goto: gotoTable, conflicts };
}
