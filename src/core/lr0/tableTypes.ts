import { LR0Item } from "./types";

export type ActionShift = { type: "shift"; to: string }; // stateId is string "S0"
export type ActionReduce = { type: "reduce"; prodId: number };
export type ActionAccept = { type: "accept" };
export type ActionEntry = ActionShift | ActionReduce | ActionAccept;

export type Conflict = {
    stateId: string;
    symbol: string; // terminal or $
    existing: ActionEntry;
    incoming: ActionEntry;
    kind: "shift/reduce" | "reduce/reduce" | "other";
    causedBy: {
        existingItems: string[]; // pretty printed items
        incomingItems: string[]; // pretty printed items
    };
};

export type LR0ParseTable = {
    action: Map<string, Map<string, ActionEntry>>; // stateId -> symbol -> action
    goto: Map<string, Map<string, string>>; // stateId -> nonTerminal -> stateId
    conflicts: Conflict[];
    isLR0: boolean;
};
