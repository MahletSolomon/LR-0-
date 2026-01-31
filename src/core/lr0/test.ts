
import { buildLR0Automaton } from "./canonical";
import { Grammar } from "../../type/grammar";
import { itemToString } from "./items";

// Grammar A: S -> a S | b
const grammarA: Grammar = {
    startSymbol: "S",
    nonTerminals: new Set(["S"]),
    terminals: new Set(["a", "b"]),
    productions: [
        { id: 0, left: "S", right: ["a", "S"], raw: "S -> a S" },
        { id: 1, left: "S", right: ["b"], raw: "S -> b" },
    ],
};

console.log("--- Testing Grammar A ---");
const result = buildLR0Automaton(grammarA);

if (result.errors.length > 0) {
    console.error("Errors:", result.errors);
} else {
    const { states, transitions } = result.automaton!;
    console.log(`States found: ${states.length}`);
    console.log(`Transitions found: ${transitions.length}`);

    states.forEach((s) => {
        console.log(`\nState ${s.id}:`);
        s.items.forEach((item) => {
            console.log(`  ${itemToString(result.automaton!.grammar, item)}`);
        });
    });

    console.log("\nTransitions:");
    transitions.forEach((t) => {
        console.log(`  ${t.fromId} --${t.symbol}--> ${t.toId}`);
    });
}
