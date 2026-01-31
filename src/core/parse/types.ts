import { ActionEntry } from "@/core/lr0/tableTypes";
import { Production } from "@/type/grammar";

export type StackSymbol = {
    symbol?: string; // e.g. "E" or "id"
    stateId: string; // e.g. "S0"
};

export type ParseStep = {
    step: number;
    stack: StackSymbol[];
    input: string[]; // remaining tokens
    action: string; // Description
    details?: {
        actionEntry?: ActionEntry;
        rule?: Production;
    };
};

export type ParseRunResult =
    | { status: "blocked"; error: string; trace: ParseStep[] }
    | { status: "error"; error: string; trace: ParseStep[] }
    | { status: "accepted"; trace: ParseStep[] };
