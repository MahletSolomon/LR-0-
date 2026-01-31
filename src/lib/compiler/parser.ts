import { Action, ParseTable } from "./lr0";
import { AugmentedGrammar } from "./lr0";

export interface ParseStep {
    id: number;
    stack: string[];
    input: string[];
    action: string;
}

export function parse(
    grammar: AugmentedGrammar,
    table: ParseTable,
    inputTokens: string[]
) {
    const steps: ParseStep[] = [];

    // We manage the stack as array of state IDs
    const stack = ["S0"];
    // Also keep symbols for visual trace
    const symbolStack: string[] = []; // aligned with stack (offset by 1?)

    // Input buffer
    const buffer = [...inputTokens, "$"];

    let stepCounter = 1;
    let status: "accepted" | "error" | "running" = "running";
    let errorMsg = "";

    while (status === "running") {
        // Safety break
        if (stepCounter > 1000) {
            status = "error";
            errorMsg = "Max steps exceeded (infinite loop?)";
            break;
        }

        const topState = stack[stack.length - 1];
        const currentToken = buffer[0];

        // Record step
        steps.push({
            id: stepCounter++,
            // Format stack nicely: S0 E S1 + S4
            stack: stack.map((s, i) => (i === 0 ? s : `${symbolStack[i - 1]} ${s}`)),
            input: [...buffer],
            action: "" // fill below
        });

        const currentStep = steps[steps.length - 1];

        // Lookup action
        const row = table.actions.get(topState);
        const action = row?.get(currentToken);

        if (!action) {
            status = "error";
            currentStep.action = `Error: Unexpected token '${currentToken}'`;
            errorMsg = `Unexpected token '${currentToken}' in state ${topState}`;
            break;
        }

        if (action.type === "shift") {
            // SHIFT
            currentStep.action = `Shift ${action.toState}`;
            stack.push(action.toState!);
            symbolStack.push(currentToken);
            buffer.shift(); // consume input

        } else if (action.type === "reduce") {
            // REDUCE
            const prod = grammar.productions.find(p => p.id === action.prodId)!;
            currentStep.action = `Reduce ${prod.raw}`;

            const popSize = prod.right.length;

            // Pop states and symbols
            for (let i = 0; i < popSize; i++) {
                stack.pop();
                symbolStack.pop();
            }

            // Top state is now t
            const t = stack[stack.length - 1];

            // Consult GOTO
            const gotoState = table.goto.get(t)?.get(prod.left);

            if (!gotoState) {
                status = "error";
                errorMsg = "Goto error (should not happen in valid table)";
                break;
            }

            // Push LHS and new state
            symbolStack.push(prod.left);
            stack.push(gotoState);

        } else if (action.type === "accept") {
            currentStep.action = "Accept";
            status = "accepted";
        }
    }

    return { steps, status, errorMsg };
}
