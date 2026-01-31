"use client";

import { useState, useMemo, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { ProductionRow } from "./ProductionRow";
import { buildGrammarFromRows, GrammarRow, GrammarBuildResult } from "@/lib/grammar-utils";
import { buildLR0Automaton, LR0BuildResult } from "@/core/lr0/canonical";
import { buildLR0ParseTable } from "@/core/lr0/buildTable";
import { itemToString } from "@/core/lr0/items";
import { Button } from "@/components/ui/button";
import { ParseTableView } from "./ParseTableView";
import { ConflictsPanel } from "./ConflictsPanel";
import { ParseTrace } from "./ParseTrace";
import { Plus, AlertTriangle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";


export function GrammarEditor() {
    const [rows, setRows] = useState<GrammarRow[]>([
        { id: uuidv4(), left: "S", right: ["E"], hasEpsilon: false },
        { id: uuidv4(), left: "E", right: ["T", "E + T"], hasEpsilon: false },
    ]);

    const [buildResult, setBuildResult] = useState<GrammarBuildResult>({ errors: [] });

    // Validate on change
    useEffect(() => {
        const result = buildGrammarFromRows(rows);
        setBuildResult(result);
    }, [rows]);

    const addRow = () => {
        setRows([
            ...rows,
            { id: uuidv4(), left: "", right: [""], hasEpsilon: false },
        ]);
    };

    const updateRow = (id: string, updates: Partial<GrammarRow>) => {
        setRows(rows.map((row) => (row.id === id ? { ...row, ...updates } : row)));
    };

    const deleteRow = (id: string) => {
        setRows(rows.filter((row) => row.id !== id));
    };

    const isValid = buildResult.errors.length === 0 && !!buildResult.grammar;

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex flex-col gap-4">
                <h1 className="text-3xl font-bold tracking-tight">Grammar Editor</h1>
                <p className="text-muted-foreground">
                    Define your grammar below. The first row's LHS is the start symbol. Use valid identifiers (letters, numbers, underscores).
                </p>
            </div>

            {!isValid && buildResult.errors.length > 0 && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Grammar Invalid</AlertTitle>
                    <AlertDescription>
                        Please fix the highlighted errors to proceed.
                        {buildResult.errors.some(e => e.message.includes("Duplicate LHS")) && (
                            <div className="mt-1 font-medium">• Remove duplicate LHS definitions.</div>
                        )}
                        {buildResult.errors.some(e => e.message.includes("LHS cannot be empty")) && (
                            <div className="mt-1 font-medium">• Ensure all rows have a Left-Hand Side symbol.</div>
                        )}
                    </AlertDescription>
                </Alert>
            )}

            {isValid && (
                <Alert className="border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-300">
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>Grammar Valid</AlertTitle>
                    <AlertDescription>
                        Ready for parsing generation.
                        <span className="font-mono text-xs ml-2">
                            ({buildResult.grammar?.nonTerminals.size} Non-Terminals, {buildResult.grammar?.terminals.size} Terminals)
                        </span>
                    </AlertDescription>
                </Alert>
            )}

            <div className="space-y-4">
                {rows.map((row, index) => (
                    <ProductionRow
                        key={row.id}
                        row={row}
                        index={index}
                        errors={buildResult.errors}
                        onChange={updateRow}
                        onDelete={deleteRow}
                    />
                ))}

                <Button onClick={addRow} className="w-full border-dashed" variant="outline">
                    <Plus className="mr-2 h-4 w-4" /> Add Production Row
                </Button>
            </div>

            {isValid && (
                <div className="space-y-4 mt-8">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold">LR(0) Automaton</h2>
                    </div>

                    <AutomatonPreview grammar={buildResult.grammar!} />
                </div>
            )}
        </div>
    );
}

function AutomatonPreview({ grammar }: { grammar: import("@/type/grammar").Grammar }) {
    const [result, setResult] = useState<LR0BuildResult | null>(null);
    const [tableResult, setTableResult] = useState<import("@/core/lr0/tableTypes").LR0ParseTable | null>(null);

    const handleBuild = () => {
        const res = buildLR0Automaton(grammar);
        setResult(res);
        if (res.automaton) {
            const table = buildLR0ParseTable(res.automaton);
            setTableResult(table);
        } else {
            setTableResult(null);
        }
    };

    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex justify-between items-center">
                        <span>Generated Automaton</span>
                        <Button onClick={handleBuild} size="sm">Build LR(0) Items & Table</Button>
                    </CardTitle>
                    <CardDescription>
                        Canonical collection of LR(0) states and Parse Table.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {!result && <div className="text-sm text-muted-foreground">Click build to generate states.</div>}

                    {result?.errors.length ? (
                        <div className="text-destructive text-sm font-medium">
                            Errors: {result.errors.join(", ")}
                        </div>
                    ) : null}

                    {result?.automaton && (
                        <div className="space-y-4">
                            <div className="flex gap-4 text-sm font-medium">
                                <div className="px-2 py-1 bg-muted rounded">States: {result.automaton.states.length}</div>
                                <div className="px-2 py-1 bg-muted rounded">Transitions: {result.automaton.transitions.length}</div>
                            </div>

                            <div className="max-h-[300px] overflow-y-auto space-y-2 border rounded-md p-2">
                                {result.automaton.states.map(state => (
                                    <div key={state.id} className="text-xs font-mono p-2 border-b last:border-0 hover:bg-muted/50">
                                        <div className="font-bold text-primary mb-1">{state.id}</div>
                                        <div className="pl-2 border-l-2 border-muted-foreground/20 space-y-0.5">
                                            {state.items.map(item => (
                                                <div key={`${item.prodId}-${item.dot}`}>
                                                    {itemToString(result.automaton!.grammar, item)}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-1 pl-2 text-muted-foreground">
                                            Transitions: {result.automaton!.transitions.filter(t => t.fromId === state.id).map(t => `${t.symbol} -> ${t.toId}`).join(", ") || "None"}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {tableResult && result?.automaton && (
                <div className="space-y-8">
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Parse Table & Conflicts</h3>
                        <ConflictsPanel table={tableResult} />
                        <ParseTableView table={tableResult} grammar={result.automaton.grammar} states={result.automaton.states} />
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Simulation</h3>
                        <ParseTrace table={tableResult} automaton={result.automaton} />
                    </div>
                </div>
            )}
        </div>
    );
}
