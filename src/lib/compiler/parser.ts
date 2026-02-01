import { Action, ParseTable } from "./lr0";
import { AugmentedGrammar } from "./lr0";

export interface ParseStep {
    id: number;
    stack: string[];
    input: string[];
    action: string;
}

export interface ParseNode {
    label: string;
    children?: ParseNode[];
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
    const symbolStack: string[] = [];
    // Tree construction stack
    const nodeStack: ParseNode[] = [];

    // Input buffer
    const buffer = [...inputTokens, "$"];

    let stepCounter = 1;
    let status: "accepted" | "error" | "running" = "running";
    let errorMsg = "";
    let tree: ParseNode | null = null;

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

            // Tree: Push leaf
            nodeStack.push({ label: currentToken });

            buffer.shift(); // consume input

        } else if (action.type === "reduce") {
            // REDUCE
            const prod = grammar.productions.find(p => p.id === action.prodId)!;
            currentStep.action = `Reduce ${prod.raw}`;

            const popSize = prod.right.length;
            const children: ParseNode[] = [];

            // Pop states and symbols
            // We pop in reverse order for the stack, but children should be in order
            for (let i = 0; i < popSize; i++) {
                stack.pop();
                symbolStack.pop();
            }

            // Pop nodes for tree
            for (let i = 0; i < popSize; i++) {
                children.unshift(nodeStack.pop()!);
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

            // Tree: Push new subtree
            nodeStack.push({ label: prod.left, children });

        } else if (action.type === "accept") {
            currentStep.action = "Accept";
            status = "accepted";
            tree = nodeStack[0] || null;
            // Unpack S' if it exists (usually we want the real start symbol)
            if (tree && tree.children && tree.children.length === 1) {
                tree = tree.children[0];
            }
        }
    }

    return { steps, status, errorMsg, tree };
}
