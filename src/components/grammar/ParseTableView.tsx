import { LR0ParseTable, ActionEntry } from "@/core/lr0/tableTypes";
import { AugmentedGrammar } from "@/core/lr0/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"; // Assuming pure table components
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";

interface ParseTableViewProps {
    table: LR0ParseTable;
    grammar: AugmentedGrammar;
    states: { id: string }[];
}

export function ParseTableView({ table, grammar, states }: ParseTableViewProps) {

    const terminals = Array.from(grammar.terminals).sort();
    terminals.push("$");

    const nonTerminals = Array.from(grammar.nonTerminals)
        .filter(nt => nt !== grammar.startPrime)
        .sort();

    return (
        <Tabs defaultValue="action" className="w-full">
            <TabsList className="grid w-full max-w-[400px] grid-cols-2">
                <TabsTrigger value="action">ACTION</TabsTrigger>
                <TabsTrigger value="goto">GOTO</TabsTrigger>
            </TabsList>
            <div className="mt-4 border rounded-md overflow-hidden">
                <TabsContent value="action" className="m-0">
                    <div className="overflow-x-auto max-h-[500px]">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead className="bg-muted text-muted-foreground sticky top-0 z-10">
                                <tr>
                                    <th className="p-2 border-b font-medium w-[80px] bg-muted">State</th>
                                    {terminals.map(t => (
                                        <th key={t} className="p-2 border-b font-medium text-center min-w-[60px] bg-muted">{t}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {states.map(state => (
                                    <tr key={state.id} className="border-b last:border-0 hover:bg-muted/50">
                                        <td className="p-2 font-mono font-bold bg-muted/20 sticky left-0">{state.id}</td>
                                        {terminals.map(t => {
                                            const entry = table.action.get(state.id)?.get(t);
                                            return (
                                                <td key={t} className="p-2 border-l text-center">
                                                    <ActionCell entry={entry} />
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </TabsContent>
                <TabsContent value="goto" className="m-0">
                    <div className="overflow-x-auto max-h-[500px]">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead className="bg-muted text-muted-foreground sticky top-0 z-10">
                                <tr>
                                    <th className="p-2 border-b font-medium w-[80px] bg-muted">State</th>
                                    {nonTerminals.map(nt => (
                                        <th key={nt} className="p-2 border-b font-medium text-center min-w-[60px] bg-muted">{nt}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {states.map(state => (
                                    <tr key={state.id} className="border-b last:border-0 hover:bg-muted/50">
                                        <td className="p-2 font-mono font-bold bg-muted/20 sticky left-0">{state.id}</td>
                                        {nonTerminals.map(nt => {
                                            const toState = table.goto.get(state.id)?.get(nt);
                                            return (
                                                <td key={nt} className="p-2 border-l text-center font-mono text-muted-foreground">
                                                    {toState || ""}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </TabsContent>
            </div>
        </Tabs>
    );
}

function ActionCell({ entry }: { entry?: ActionEntry }) {
    if (!entry) return null;

    if (entry.type === "shift") {
        return <Badge variant="secondary" className="font-mono text-xs">s{entry.to.replace("S", "")}</Badge>;
    }
    if (entry.type === "reduce") {
        return <Badge variant="outline" className="font-mono text-xs text-blue-600 border-blue-200">r{entry.prodId}</Badge>;
    }
    if (entry.type === "accept") {
        return <Badge className="bg-green-600 font-mono text-xs">acc</Badge>;
    }
    return null;
}
