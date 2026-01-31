// Basic types for our grammar
export type Symbol = string;

export interface Production {
    id: number;
    left: Symbol;
    right: Symbol[];
    raw: string; // "S -> A B" for display
}

export interface Grammar {
    startSymbol: Symbol;
    nonTerminals: Set<Symbol>;
    terminals: Set<Symbol>;
    productions: Production[];
}

// UI Types (Shared)
export interface GrammarRow {
    id: string; // uuid
    left: string;
    right: string[]; // array of alternative strings
    hasEpsilon: boolean;
}

export interface BuildError {
    rowId?: string;
    field?: "lhs" | "rhs";
    altIndex?: number;
    message: string;
}

// Helper to tokenize the RHS of a rule
// We assume tokens are separated by spaces, but we also handle simple punctuation
export function getTokens(str: string): string[] {
    // 4th year impl: just simple regex splitting and filtering
    // keeping it robust though
    const SINGLE = new Set(["+", "*", "(", ")", "$", "|"]);

    const tokens: string[] = [];
    let i = 0;

    while (i < str.length) {
        const char = str[i];

        // Skip whitespace
        if (/\s/.test(char)) {
            i++;
            continue;
        }

        // Check for single char tokens
        if (SINGLE.has(char)) {
            tokens.push(char);
            i++;
            continue;
        }

        // Otherwise read until next delimiter
        let j = i;
        while (j < str.length && !SINGLE.has(str[j]) && !/\s/.test(str[j])) {
            j++;
        }

        if (j > i) {
            tokens.push(str.substring(i, j));
            i = j;
        } else {
            // Just safety, prevent infinite loop if weird char
            i++;
        }
    }
    return tokens;
}
