import { LR0Automaton } from "@/core/lr0/types";
import { LR0ParseTable } from "@/core/lr0/tableTypes";
import { ParseRunResult, ParseStep, StackSymbol } from "./types";
import { itemToString } from "@/core/lr0/items";

export function runLRParse(
    table: LR0ParseTable,
    automaton: LR0Automaton,
    inputStr: string
): ParseRunResult {
    // 1. Check if table is valid
    if (!table.isLR0) {
        return {
            status: "blocked",
            error: "Grammar is not LR(0). Checks conflicts before parsing.",
            trace: [],
        };
    }

    // 2. Tokenize
    // Simple splitting by space.
    const tokens = inputStr.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0 && inputStr.trim().length === 0) {
        // Empty input?
        // Just keep it empty array.
    }
    // Append end marker
    const input = [...tokens, "$"];

    // 3. Initialize Stack
    // Stack of states. We also store symbols for visualization.
    // Initial state is usually S0.
    const stack: StackSymbol[] = [{ stateId: "S0" }];

    const trace: ParseStep[] = [];
    let stepCount = 0;
    const MAX_STEPS = 1000;

    // 4. Parse Loop
    while (stepCount < MAX_STEPS) {
        const currentStateId = stack[stack.length - 1].stateId;
        const lookahead = input[0];

        // Log step PRE-action
        trace.push({
            step: stepCount + 1,
            stack: [...stack],
            input: [...input],
            action: "", // to be filled
        });

        const actionRow = table.action.get(currentStateId);
        const action = actionRow?.get(lookahead);

        if (!action) {
            // Error
            const lastStep = trace[trace.length - 1];
            lastStep.action = `Error: Unexpected token '${lookahead}'`;
            return {
                status: "error",
                error: `Unexpected token '${lookahead}' in state ${currentStateId}`,
                trace,
            };
        }

        const lastStep = trace[trace.length - 1];

        // EXECUTE ACTION
        if (action.type === "shift") {
            lastStep.action = `Shift ${action.to}`;
            lastStep.details = { actionEntry: action };

            // Push symbol and new state
            stack.push({ symbol: lookahead, stateId: action.to });
            // Consume input
            input.shift();

        } else if (action.type === "reduce") {
            const prod = automaton.grammar.productions.find(p => p.id === action.prodId);
            if (!prod) throw new Error(`Production ${action.prodId} not found`);

            lastStep.action = `Reduce: ${prod.raw}`;
            lastStep.details = { actionEntry: action, rule: prod };

            // Pop RHS length
            // Note: For epsilon (rhs length 0), we pop 0.
            // For A -> a b, we pop 2 items.
            const popCount = prod.right.length;

            // Safety check
            if (stack.length - 1 < popCount) {
                return { status: "error", error: "Stack underflow during reduce", trace };
            }

            // Pop
            for (let i = 0; i < popCount; i++) {
                stack.pop();
            }

            // Current top after pop
            const topStateId = stack[stack.length - 1].stateId;

            // GOTO
            const gotoRow = table.goto.get(topStateId);
            const nextStateId = gotoRow?.get(prod.left);

            if (!nextStateId) {
                return { status: "error", error: `No GOTO for non-terminal ${prod.left} in state ${topStateId}`, trace };
            }

            // Push LHS
            stack.push({ symbol: prod.left, stateId: nextStateId });

        } else if (action.type === "accept") {
            lastStep.action = "Accept";
            lastStep.details = { actionEntry: action };
            return { status: "accepted", trace };
        }

        stepCount++;
    }

    return { status: "error", error: "Max steps exceeded", trace };
}
