import { buildLR0Automaton } from "./canonical";
import { buildLR0ParseTable } from "./buildTable";
import { Grammar } from "../../type/grammar";

// 1. Valid LR(0) Grammar
// S -> a S | b
const prob0: Grammar = {
    startSymbol: "S",
    nonTerminals: new Set(["S"]),
    terminals: new Set(["a", "b"]),
    productions: [
        { id: 0, left: "S", right: ["a", "S"], raw: "S -> a S" },
        { id: 1, left: "S", right: ["b"], raw: "S -> b" },
    ],
};

// 2. Expression Grammar (Not LR0, has Shift/Reduce conflicts)
// E -> E + T | T
// T -> T * F | F
// F -> ( E ) | id
const exprGrammar: Grammar = {
    startSymbol: "E",
    nonTerminals: new Set(["E", "T", "F"]),
    terminals: new Set(["+", "*", "(", ")", "id"]),
    productions: [
        { id: 0, left: "E", right: ["E", "+", "T"], raw: "E -> E + T" },
        { id: 1, left: "E", right: ["T"], raw: "E -> T" },
        { id: 2, left: "T", right: ["T", "*", "F"], raw: "T -> T * F" },
        { id: 3, left: "T", right: ["F"], raw: "T -> F" },
        { id: 4, left: "F", right: ["(", "E", ")"], raw: "F -> ( E )" },
        { id: 5, left: "F", right: ["id"], raw: "F -> id" },
    ],
};

const runTest = (name: string, grammar: Grammar, expectConflict: boolean) => {
    console.log(`\n=== Testing ${name} ===`);
    const auto = buildLR0Automaton(grammar);
    if (auto.errors.length) {
        console.error("Automaton Errors:", auto.errors);
        return;
    }
    const table = buildLR0ParseTable(auto.automaton!);

    console.log(`Is LR(0)? ${table.isLR0}`);
    console.log(`Conflicts: ${table.conflicts.length}`);

    if (expectConflict && table.isLR0) {
        console.error("FAIL: Expected conflicts but found none.");
    } else if (!expectConflict && !table.isLR0) {
        console.error("FAIL: Expected no conflicts but found some.");
        table.conflicts.forEach(c => {
            console.log(`  ${c.kind} at ${c.stateId} on '${c.symbol}'`);
        });
    } else {
        console.log("PASS: Result matches expectation.");
        if (table.conflicts.length > 0) {
            console.log("Sample Conflict:");
            const c = table.conflicts[0];
            console.log(`  State: ${c.stateId}, Sym: ${c.symbol}, Kind: ${c.kind}`);
            console.log(`  Existing: ${JSON.stringify(c.existing)}`);
            console.log(`  Incoming: ${JSON.stringify(c.incoming)}`);
        }
    }
};

runTest("Valid LR(0)", prob0, false);
runTest("Expression (Shift/Reduce)", exprGrammar, true);
