import { useState } from "react";
import { LR0Automaton } from "@/core/lr0/types";
import { LR0ParseTable } from "@/core/lr0/tableTypes";
import { runLRParse } from "@/core/parse/runLRParse";
import { ParseRunResult } from "@/core/parse/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Play, AlertOctagon, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ParseTraceProps {
    table: LR0ParseTable;
    automaton: LR0Automaton;
}

export function ParseTrace({ table, automaton }: ParseTraceProps) {
    const [inputStr, setInputStr] = useState("");
    const [result, setResult] = useState<ParseRunResult | null>(null);

    const handleRun = () => {
        const res = runLRParse(table, automaton, inputStr);
        setResult(res);
    };

    return (
        <div className="space-y-6">
            <Card className="border-l-4 border-l-blue-500">
                <CardHeader>
                    <CardTitle className="text-lg">Parse Simulator</CardTitle>
                    <CardDescription>
                        Test your grammar by simulating an LR(0) parse run. Enter tokens separated by spaces.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <Input
                            placeholder="e.g. id + id"
                            value={inputStr}
                            onChange={(e) => setInputStr(e.target.value)}
                            className="font-mono"
                        />
                        <Button onClick={handleRun} disabled={!table.isLR0}>
                            <Play className="mr-2 h-4 w-4" /> Run Parse
                        </Button>
                    </div>

                    {!table.isLR0 && (
                        <div className="text-destructive text-sm font-medium">
                            Simulation disabled: Grammar has conflicts.
                        </div>
                    )}
                </CardContent>
            </Card>

            {result && (
                <div className="space-y-4">
                    {result.status === "accepted" && (
                        <Alert className="bg-green-50 text-green-700 border-green-200">
                            <CheckCircle2 className="h-4 w-4" />
                            <AlertTitle>Accepted</AlertTitle>
                            <AlertDescription>The input was successfully parsed.</AlertDescription>
                        </Alert>
                    )}
                    {(result.status === "error" || result.status === "blocked") && (
                        <Alert variant="destructive">
                            <AlertOctagon className="h-4 w-4" />
                            <AlertTitle>Parse {result.status === "blocked" ? "Blocked" : "Error"}</AlertTitle>
                            <AlertDescription>{result.error}</AlertDescription>
                        </Alert>
                    )}

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm">Execution Trace ({result.trace.length} steps)</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-muted text-muted-foreground">
                                        <tr>
                                            <th className="p-2 w-[60px] text-center">Step</th>
                                            <th className="p-2 min-w-[120px]">Stack</th>
                                            <th className="p-2 min-w-[120px]">Input</th>
                                            <th className="p-2 min-w-[200px]">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {result.trace.map((step) => (
                                            <tr key={step.step} className="border-b last:border-0 hover:bg-muted/50 font-mono text-xs">
                                                <td className="p-2 text-center text-muted-foreground">{step.step}</td>
                                                <td className="p-2">
                                                    <div className="flex flex-wrap gap-1">
                                                        {step.stack.map((s, i) => (
                                                            <span key={i} className="bg-muted px-1 rounded flex items-center">
                                                                {s.symbol && <span className="font-semibold mr-1">{s.symbol}</span>}
                                                                <span className="text-muted-foreground text-[10px]">{s.stateId}</span>
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="p-2 tracking-wide">
                                                    {step.input.join(" ")}
                                                </td>
                                                <td className="p-2">
                                                    <ActionBadge action={step.action} />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}

function ActionBadge({ action }: { action: string }) {
    if (action.startsWith("Shift")) return <Badge variant="secondary" className="font-normal">{action}</Badge>;
    if (action.startsWith("Reduce")) return <Badge variant="outline" className="font-normal text-blue-600 border-blue-200">{action}</Badge>;
    if (action === "Accept") return <Badge className="bg-green-600 font-normal">Accept</Badge>;
    if (action.startsWith("Error")) return <Badge variant="destructive" className="font-normal">Error</Badge>;
    return <span>{action}</span>;
}
