import { LR0ParseTable, Conflict } from "@/core/lr0/tableTypes";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Info } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

export function ConflictsPanel({ table }: { table: LR0ParseTable }) {
    if (table.isLR0) {
        return (
            <Alert className="border-green-500/50 bg-green-500/5 text-green-700">
                <Info className="h-4 w-4" />
                <AlertTitle>No Conflicts</AlertTitle>
                <AlertDescription>
                    The grammar is LR(0). The parse table was generated successfully without conflicts.
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="space-y-4">
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Conflicts Detected ({table.conflicts.length})</AlertTitle>
                <AlertDescription>
                    The grammar is NOT LR(0). The following conflicts were found during table generation.
                </AlertDescription>
            </Alert>

            <Accordion type="single" collapsible className="w-full border rounded-md">
                {table.conflicts.map((conflict, idx) => (
                    <AccordionItem key={idx} value={`item-${idx}`} className="px-4">
                        <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center gap-4 text-sm w-full">
                                <div className="font-mono bg-muted px-2 py-1 rounded">{conflict.stateId}</div>
                                <div className="font-bold text-muted-foreground w-6 text-center">{conflict.symbol}</div>
                                <Badge variant="destructive">{conflict.kind}</Badge>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <div className="grid grid-cols-2 gap-4 pt-2 pb-4">
                                <div className="space-y-2 p-3 bg-muted/50 rounded-md">
                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Existing Action</h4>
                                    <div className="text-sm font-medium">
                                        {formatAction(conflict.existing)}
                                    </div>
                                    <div className="text-xs text-muted-foreground border-t pt-2 mt-2">
                                        <div className="mb-1">Caused by items:</div>
                                        {conflict.causedBy.existingItems.map((s, i) => (
                                            <div key={i} className="font-mono text-[10px]">{s}</div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2 p-3 bg-muted/50 rounded-md">
                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Incoming Action</h4>
                                    <div className="text-sm font-medium">
                                        {formatAction(conflict.incoming)}
                                    </div>
                                    <div className="text-xs text-muted-foreground border-t pt-2 mt-2">
                                        <div className="mb-1">Caused by items:</div>
                                        {conflict.causedBy.incomingItems.map((s, i) => (
                                            <div key={i} className="font-mono text-[10px]">{s}</div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </div>
    );
}

function formatAction(action: any) {
    if (action.type === "shift") return `Shift to ${action.to}`;
    if (action.type === "reduce") return `Reduce using prod #${action.prodId}`;
    if (action.type === "accept") return "Accept";
    return "Unknown";
}
