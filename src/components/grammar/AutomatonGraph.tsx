"use client";

import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { LR0State, LR0Transition, formatItem } from "@/lib/compiler/lr0";
import { Grammar } from "@/lib/compiler/grammar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";

interface AutomatonGraphProps {
    grammar: Grammar;
    states: LR0State[];
    transitions: LR0Transition[];
}

export function AutomatonGraph({ grammar, states, transitions }: AutomatonGraphProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [svg, setSvg] = useState<string>("");
    const [renderId, setRenderId] = useState(0);

    // Initialize mermaid
    useEffect(() => {
        mermaid.initialize({
            startOnLoad: false,
            theme: 'base',
            securityLevel: 'loose',
            themeVariables: {
                primaryColor: '#e2e8f0',
                primaryTextColor: '#0f172a',
                lineColor: '#64748b',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
            }
        });
    }, []);

    // Build graph definition
    useEffect(() => {
        const buildGraph = async () => {
            if (!grammar || states.length === 0) return;

            let graph = "graph TD\n";

            // Add States
            states.forEach(s => {
                // Escape HTML for label
                const items = s.items
                    .map(i => formatItem(grammar, i))
                    .join("<br/>")
                    .replace(/"/g, "'"); // minimal escaping

                // Node definition: id["Label"]
                graph += `    ${s.id}["<b>${s.id}</b><br/><div style='text-align:left'>${items}</div>"]\n`;

                // Style - light background
                graph += `    style ${s.id} fill:#f8fafc,stroke:#94a3b8,stroke-width:1px\n`;
            });

            // Add Transitions
            transitions.forEach(t => {
                graph += `    ${t.from} -->|${t.symbol}| ${t.to}\n`;
            });

            // Render
            try {
                const id = `mermaid-${Date.now()}`;
                const { svg } = await mermaid.render(id, graph);
                setSvg(svg);
            } catch (e) {
                console.error("Mermaid failed to render", e);
                setSvg("");
            }
        };

        buildGraph();
    }, [grammar, states, transitions, renderId]);

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>State Diagram</CardTitle>
                    <CardDescription>Visual DFA of LR(0) items</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setRenderId(p => p + 1)}>
                    <RefreshCcw className="w-4 h-4" />
                </Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto min-h-[500px] flex justify-center bg-white/50 p-0">
                {svg ? (
                    <div
                        dangerouslySetInnerHTML={{ __html: svg }}
                        className="w-full flex justify-center p-4 [&>svg]:max-w-full [&>svg]:h-auto"
                    />
                ) : (
                    <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                        Loading Diagram...
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
