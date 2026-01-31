import { Grammar, Production } from "@/type/grammar";
import { AugmentedGrammar } from "./types";

export function augmentGrammar(grammar: Grammar): AugmentedGrammar {
    const { startSymbol, nonTerminals, terminals, productions } = grammar;

    // 1. Create unique startPrime
    let startPrime = `${startSymbol}'`;
    while (nonTerminals.has(startPrime) || terminals.has(startPrime)) {
        startPrime += "'";
    }

    // 2. Create Augmented Productions
    // Prod 0 is S' -> S
    const startProd: Production = {
        id: 0,
        left: startPrime,
        right: [startSymbol],
        raw: `${startPrime} -> ${startSymbol}`,
    };

    // Re-index original productions starting from 1
    const reindexedProds = productions.map((p, index) => ({
        ...p,
        id: index + 1,
    }));

    const augmentedProds = [startProd, ...reindexedProds];

    // 3. Update NonTerminals
    const newNonTerminals = new Set(nonTerminals);
    newNonTerminals.add(startPrime);

    return {
        originalStartSymbol: startSymbol,
        startPrime,
        productions: augmentedProds,
        terminals: terminals, // Unchanged
        nonTerminals: newNonTerminals,
    };
}
