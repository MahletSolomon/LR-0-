import { buildLR0Automaton } from "../lr0/canonical";
import { buildLR0ParseTable } from "../lr0/buildTable";
import { runLRParse } from "./runLRParse";
import { Grammar } from "../../type/grammar";

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

function verify(name: string, grammar: Grammar, input: string, expect: "accepted" | "error" | "blocked") {
    console.log(`\n=== Testing ${name}: "${input}" ===`);
    const auto = buildLR0Automaton(grammar);
    if (auto.errors.length) { console.error("Grammar error"); return; }

    const table = buildLR0ParseTable(auto.automaton!);
    const res = runLRParse(table, auto.automaton!, input);

    console.log(`Status: ${res.status}`);
    if (res.status !== expect) {
        console.error(`FAIL: Expected ${expect} but got ${res.status}`);
        if (res.status === 'error' || res.status === 'blocked') console.error(res.error);
    } else {
        console.log("PASS");
    }

    // Print trace summary
    if (res.trace.length) {
        console.log(`Steps: ${res.trace.length}`);
        console.log("Last Action: " + res.trace[res.trace.length - 1].action);
    }
}

verify("Valid Input", prob0, "a a b", "accepted");
verify("Invalid Input", prob0, "a a a", "error");
