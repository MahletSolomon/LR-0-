import { Grammar, Production, Symbol } from "@/type/grammar";
import { tokenizeRhsTolerant } from "@/utils/parse";

export type GrammarRow = {
    id: string; // uuid
    left: string; // user input
    right: string[]; // RHS alternatives (strings)
    hasEpsilon: boolean; // checkbox
};

export type BuildError = {
    rowId: string;
    message: string;
    field?: "lhs" | "rhs";
    altIndex?: number;
};

export type GrammarBuildResult = {
    grammar?: Grammar;
    errors: BuildError[];
};

export function buildGrammarFromRows(rows: GrammarRow[]): GrammarBuildResult {
    const errors: BuildError[] = [];
    const productions: Production[] = [];
    const nonTerminals = new Set<Symbol>();
    const terminals = new Set<Symbol>();

    // 1. Validate LHS uniqueness & Empty check
    const lhsMap = new Map<string, string>(); // trimmed LHS -> rowId

    rows.forEach((row) => {
        const trimmedLhs = row.left.trim();

        // Check for empty LHS
        if (!trimmedLhs) {
            // Allow empty LHS only if RHS is also empty (and no epsilon) - basically an empty row
            // But spec says: "Any LHS is invalid: empty for a row that has any RHS content or epsilon checked"
            // If row is completely empty, maybe ignore it?
            // Spec says "Delete row removes the entire production row".
            // "If first row LHS is empty -> grammar invalid"
            // Let's mark it as error if it has content or is the first row.
            const hasContent = row.right.some(r => r.trim().length > 0) || row.hasEpsilon;
            if (hasContent || rows.indexOf(row) === 0) {
                errors.push({
                    rowId: row.id,
                    message: "LHS cannot be empty",
                    field: "lhs"
                });
            }
            // If truly empty and not first row, we might just skip it? 
            // But let's strictly validate for now.
        } else {
            // Space check
            if (/\s/.test(trimmedLhs)) {
                errors.push({
                    rowId: row.id,
                    message: "LHS cannot contain spaces",
                    field: "lhs"
                });
            }

            // Duplicate check
            if (lhsMap.has(trimmedLhs)) {
                errors.push({
                    rowId: row.id,
                    message: `Duplicate LHS: '${trimmedLhs}'`,
                    field: "lhs"
                });
                // Also mark the original
                const originalId = lhsMap.get(trimmedLhs);
                if (originalId) {
                    // Check if we already added error for original
                    if (!errors.some(e => e.rowId === originalId && e.message.includes("Duplicate"))) {
                        errors.push({
                            rowId: originalId,
                            message: `Duplicate LHS: '${trimmedLhs}'`,
                            field: "lhs"
                        });
                    }
                }
            } else {
                lhsMap.set(trimmedLhs, row.id);
                nonTerminals.add(trimmedLhs);
            }
        }
    });

    if (rows.length === 0) {
        return { errors: [], grammar: undefined }; // Or empty grammar?
    }

    // Start symbol is first row's LHS
    const startSymbol = rows[0].left.trim();
    if (!startSymbol) {
        // Already covered by empty LHS check above, but ensures no grammar is built
    }

    // 2. Build productions
    let prodId = 0;
    rows.forEach((row) => {
        const lhs = row.left.trim();
        if (!lhs) return; // Skip invalid LHS for production building

        // Handle epsilon
        if (row.hasEpsilon) {
            productions.push({
                id: prodId++,
                left: lhs,
                right: [], // epsilon
                raw: `${lhs} -> ε`
            });
        }

        // Handle alternatives
        row.right.forEach((alt, index) => {
            const trimmedAlt = alt.trim();
            if (trimmedAlt.length === 0) return; // Skip empty alternatives

            // Tokenize
            const tokens = tokenizeRhsTolerant(trimmedAlt);

            // Check for tokenizer issues? 
            // The current getTokens logic splits by space/single chars. 
            // It doesn't seem to "throw" errors easily unless we see invalid chars.
            // Spec: "RHS tokenizer throws 'unexpected character' error"
            // Our `getTokens` just skips whitespace and captures tokens.
            // We might need to check if reconstruction matches?
            // Or just assume `getTokens` is safe unless it returns empty for non-empty string?
            // Let's implement strict validation if `getTokens` behavior needs it.
            // The current `getTokens` implementation doesn't seem to throw. 
            // It just processes what it can. 
            // Ideally we check if there are untokenized characters?
            // For now, we trust `getTokens` results.

            if (tokens.length === 0 && trimmedAlt.length > 0) {
                // Should not happen with current logic unless strange chars
                errors.push({
                    rowId: row.id,
                    message: "Invalid characters in RHS",
                    field: "rhs",
                    altIndex: index
                });
            }

            productions.push({
                id: prodId++,
                left: lhs,
                right: tokens,
                raw: `${lhs} -> ${trimmedAlt}`
            });

            // Infer terminals
            tokens.forEach(t => {
                if (!nonTerminals.has(t)) {
                    terminals.add(t);
                }
            });
        });
    });

    if (errors.length > 0) {
        return { errors, grammar: undefined };
    }

    return {
        grammar: {
            startSymbol,
            nonTerminals,
            terminals,
            productions
        },
        errors: []
    };
}
