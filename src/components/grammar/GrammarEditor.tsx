"use client";

import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { Plus, AlertTriangle, CheckCircle, Play } from "lucide-react";

// Components
import { ProductionRow } from "./ProductionRow";
import { AutomatonGraph } from "./AutomatonGraph";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Compiler Logic (My Lib)
import { getTokens, Grammar, Production, GrammarRow } from "@/lib/compiler/grammar";
import { buildAutomaton, buildTable, formatItem, ParseTable, LR0State, AugmentedGrammar } from "@/lib/compiler/lr0";
import { parse } from "@/lib/compiler/parser";
import { ParseTrace } from "./ParseTrace";

// Local types no longer needed
// export interface GrammarRow {
//     id: string;
//     left: string;
//     right: string[];
//     hasEpsilon: boolean;
// }

export function GrammarEditor() {
    // --- State ---
    const [rows, setRows] = useState<GrammarRow[]>([
        { id: uuidv4(), left: "S", right: ["E"], hasEpsilon: false },
        { id: uuidv4(), left: "E", right: ["T", "E + T"], hasEpsilon: false },
        { id: uuidv4(), left: "T", right: ["id"], hasEpsilon: false },
    ]);

    const [grammar, setGrammar] = useState<Grammar | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Parse Sim State
    const [testInput, setTestInput] = useState("id + id");
    const [simResult, setSimResult] = useState<any>(null);

    // --- Effects ---

    // validate and build grammar object whenever rows change
    useEffect(() => {
        try {
            const built = buildGrammar(rows);
            setGrammar(built);
            setError(null);
        } catch (err: any) {
            setGrammar(null);
            setError(err.message);
        }
    }, [rows]);


    // --- Helpers ---

    // Converts UI rows to Grammar object
    // Throws string on error
    const buildGrammar = (rows: GrammarRow[]): Grammar => {
        const productions: Production[] = [];
        let pid = 1;
        const nonTerminals = new Set<string>();
        const terminals = new Set<string>();

        if (rows.length === 0) throw new Error("Grammar is empty");

        // First pass: collect LHS
        rows.forEach(r => {
            const lhs = r.left.trim();
            if (!lhs) throw new Error("LHS cannot be empty");
            if (/\s/.test(lhs)) throw new Error(`Invalid LHS '${lhs}' (no spaces)`);
            if (nonTerminals.has(lhs)) throw new Error(`Duplicate LHS '${lhs}'`);
            nonTerminals.add(lhs);
        });

        const startSymbol = rows[0].left.trim();

        // Second pass: build productions
        rows.forEach(r => {
            const lhs = r.left.trim();

            if (r.hasEpsilon) {
                productions.push({
                    id: pid++,
                    left: lhs,
                    right: [],
                    raw: `${lhs} -> ε`
                });
            }

            r.right.forEach(alt => {
                const str = alt.trim();
                if (!str) return;

                const tokens = getTokens(str);
                // Find terminals
                tokens.forEach(t => {
                    if (!nonTerminals.has(t)) terminals.add(t);
                });

                productions.push({
                    id: pid++,
                    left: lhs,
                    right: tokens,
                    raw: `${lhs} -> ${str}`
                });
            });
        });

        return {
            startSymbol,
            nonTerminals,
            terminals,
            productions
        };
    };

    // --- Handlers ---

    const addRow = () => {
        setRows([...rows, { id: uuidv4(), left: "", right: [""], hasEpsilon: false }]);
    };

    const updateRow = (id: string, diff: Partial<GrammarRow>) => {
        setRows(rows.map(r => r.id === id ? { ...r, ...diff } : r));
    };

    const deleteRow = (id: string) => {
        setRows(rows.filter(r => r.id !== id));
    };

    const runSimulation = (automatonData: any) => {
        if (!automatonData || !automatonData.table) return;
        // simple tokenize for simulator
        const tokens = getTokens(testInput);
        const result = parse(automatonData.grammar, automatonData.table, tokens);
        setSimResult(result);
    };

    // --- Render ---

    // Computed results (memo-ish)
    let automatonResult = null;
    if (grammar && !error) {
        const { grammar: aug, states, transitions } = buildAutomaton(grammar);
        const table = buildTable(aug, states, transitions);
        automatonResult = { grammar: aug, states, transitions, table };
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8 p-4">

            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold">Compiler Design Lab: LR(0) Parser</h1>
                <p className="text-muted-foreground mt-2">
                    Build a grammar, generate the LR(0) automaton, and verify it against conflicts.
                </p>
            </div>

            {/* Editor Area */}
            <Card>
                <CardHeader>
                    <CardTitle>Grammar Definition</CardTitle>
                    <CardDescription>Start symbol is the first row.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">

                    {error && (
                        <Alert variant="destructive">
                            <AlertTriangle className="w-4 h-4" />
                            <AlertTitle>Invalid Grammar</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {!error && grammar && (
                        <Alert className="bg-green-50 text-green-700 border-green-200">
                            <CheckCircle className="w-4 h-4" />
                            <AlertTitle>Valid Grammar</AlertTitle>
                            <AlertDescription>
                                {grammar.nonTerminals.size} Non-Terminals, {grammar.terminals.size} Terminals
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="space-y-4">
                        {rows.map((row, i) => (
                            <ProductionRow
                                key={row.id}
                                row={row}
                                index={i}
                                errors={[]} // Todo: pass detailed validation errors
                                onChange={updateRow}
                                onDelete={deleteRow}
                            />
                        ))}
                    </div>

                    <Button variant="outline" className="w-full border-dashed" onClick={addRow}>
                        <Plus className="mr-2 w-4 h-4" /> Add Production
                    </Button>

                </CardContent>
            </Card>

            {/* Automaton & Table Output */}
            {automatonResult && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

                    {/* LR0 Automaton View (Tabs) */}
                    <Tabs defaultValue="graph" className="w-full">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-lg font-semibold">Automaton States</h2>
                            <TabsList>
                                <TabsTrigger value="list">List View</TabsTrigger>
                                <TabsTrigger value="graph">Graph View</TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="list">
                            <Card>
                                <CardHeader>
                                    <CardTitle>LR(0) Automaton Items</CardTitle>
                                    <CardDescription>Canonical collection of states ({automatonResult.states.length})</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto">
                                        {automatonResult.states.map(state => (
                                            <div key={state.id} className="border rounded p-3 text-xs bg-muted/30 hover:bg-muted transition-colors">
                                                <div className="font-bold border-b pb-1 mb-2 flex justify-between">
                                                    <span>{state.id}</span>
                                                    {/* Transitions from this state */}
                                                    <div className="flex gap-1">
                                                        {automatonResult?.transitions
                                                            .filter(t => t.from === state.id)
                                                            .map(t => (
                                                                <Badge key={t.symbol + t.to} variant="outline" className="text-[10px] h-4 px-1 py-0">
                                                                    {t.symbol}→{t.to}
                                                                </Badge>
                                                            ))}
                                                    </div>
                                                </div>
                                                <div className="space-y-1 font-mono text-muted-foreground">
                                                    {state.items.map((item, idx) => (
                                                        <div key={idx}>{formatItem(automatonResult?.grammar!, item)}</div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="graph" className="h-[600px]">
                            <AutomatonGraph
                                grammar={automatonResult.grammar}
                                states={automatonResult.states}
                                transitions={automatonResult.transitions}
                            />
                        </TabsContent>
                    </Tabs>

                    {/* Parse Table & Conflicts */}
                    <div className="flex flex-col space-y-8">
                        <div>
                            <ParseTableView
                                table={automatonResult.table}
                                terminals={[...Array.from(automatonResult.grammar.terminals), "$"]}
                                nonTerminals={[...Array.from(automatonResult.grammar.nonTerminals)].filter(n => n !== automatonResult!.grammar.startPrime)}
                                states={automatonResult.states.map(s => s.id)}
                            />
                        </div>

                        {/* Simulator Panel (Bottom) */}
                        <div>
                            <Card className="h-full">
                                <CardHeader>
                                    <CardTitle>Simulate Parse</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex gap-2">
                                        <Input
                                            value={testInput}
                                            onChange={e => setTestInput(e.target.value)}
                                            placeholder="Tokens (e.g. id + id)"
                                        />
                                        <Button size="icon" onClick={() => runSimulation(automatonResult)}>
                                            <Play className="w-4 h-4" />
                                        </Button>
                                    </div>

                                    {automatonResult.table.conflicts.length > 0 && (
                                        <Alert variant="destructive" className="py-2">
                                            <AlertTriangle className="w-3 h-3" />
                                            <AlertDescription className="text-xs ml-2">
                                                Warning: Grammar has conflicts! Simulation might fail or use defaults.
                                            </AlertDescription>
                                        </Alert>
                                    )}

                                    {simResult && (
                                        <>
                                            <div className="border rounded-md p-2 bg-muted/50 text-xs font-mono h-[300px] overflow-y-auto">
                                                {simResult.status === "error" && (
                                                    <div className="text-red-500 font-bold mb-2">Error: {simResult.errorMsg}</div>
                                                )}
                                                {simResult.status === "accepted" && (
                                                    <div className="text-green-600 font-bold mb-2">Accepted!</div>
                                                )}

                                                <table className="w-full text-left opacity-90">
                                                    <thead>
                                                        <tr className="border-b">
                                                            <th className="pb-1">Step</th>
                                                            <th className="pb-1">Stack</th>
                                                            <th className="pb-1">Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {simResult.steps.map((step: any) => (
                                                            <tr key={step.id}>
                                                                <td className="align-top py-1 pr-2 text-muted-foreground">{step.id}</td>
                                                                <td className="align-top py-1 pr-2 break-all">{step.stack.join(" ")}</td>
                                                                <td className="align-top py-1 text-blue-600">{step.action}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* Render Tree if complete */}
                                            {simResult.tree && <ParseTrace node={simResult.tree} />}
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Conflicts List */}
                    {
                        automatonResult.table.conflicts.length > 0 && (
                            <Card className="border-destructive/50 bg-destructive/5">
                                <CardHeader>
                                    <CardTitle className="text-destructive flex items-center gap-2">
                                        <AlertTriangle /> Conflicts Detected ({automatonResult.table.conflicts.length})
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ul className="list-disc pl-5 space-y-1 text-sm">
                                        {automatonResult.table.conflicts.map((c, i) => (
                                            <li key={i}>
                                                <span className="font-bold">{c.stateId}</span> on symbol <span className="font-mono bg-background px-1 rounded">{c.symbol}</span>: {c.msg}
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </Card>
                        )
                    }

                </div >
            )
            }
        </div >
    );
}

// Simple Table Component (Inline for "Student" simplicity)
function ParseTableView({ table, terminals, nonTerminals, states }: any) {
    const allCols = [...terminals, ...nonTerminals];

    return (
        <Card className="h-full overflow-hidden flex flex-col">
            <CardHeader>
                <CardTitle>Parse Table</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-0">
                <table className="w-full text-center text-xs border-collapse">
                    <thead className="bg-muted sticky top-0">
                        <tr>
                            <th className="p-2 border-b border-r bg-muted">State</th>
                            {allCols.map(c => (
                                <th key={c} className={`p-2 border-b min-w-[40px] ${terminals.includes(c) ? 'font-bold' : 'text-muted-foreground italic'}`}>
                                    {c}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {states.map((s: string) => (
                            <tr key={s} className="hover:bg-muted/30">
                                <td className="p-2 border-r font-mono bg-muted/20">{s}</td>
                                {allCols.map(c => {
                                    const isTerm = terminals.includes(c);
                                    let cell = "";
                                    let style = "";

                                    if (isTerm) {
                                        const act = table.actions.get(s)?.get(c);
                                        if (act) {
                                            if (act.type === 'shift') { cell = `s${act.toState?.substring(1)}`; style = "text-blue-600"; }
                                            if (act.type === 'reduce') { cell = `r${act.prodId}`; style = "text-orange-600"; }
                                            if (act.type === 'accept') { cell = "acc"; style = "font-bold text-green-600"; }
                                        }
                                    } else {
                                        const goto = table.goto.get(s)?.get(c);
                                        if (goto) { cell = goto.substring(1); style = "text-muted-foreground"; }
                                    }

                                    return (
                                        <td key={c} className={`border-b border-r last:border-r-0 p-1 ${style}`}>
                                            {cell}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </CardContent>
        </Card>
    );
}
