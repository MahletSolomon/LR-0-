
import React from 'react';
import { ParseNode } from '@/lib/compiler/parser';
import { Card, CardContent } from "@/components/ui/card";

interface ParseTraceProps {
    node: ParseNode | null;
}

export function ParseTrace({ node }: ParseTraceProps) {
    if (!node) return null;

    return (
        <Card className="mt-6 overflow-hidden">
            <CardContent className="p-6 overflow-auto">
                <h3 className="text-lg font-bold mb-4">Parse Tree</h3>
                <div className="flex justify-center min-w-fit">
                    <TreeNode node={node} />
                </div>
            </CardContent>
        </Card>
    );
}

function TreeNode({ node }: { node: ParseNode }) {
    const isLeaf = !node.children || node.children.length === 0;

    return (
        <div className="flex flex-col items-center mx-2">
            <div className={`
                border rounded-md px-3 py-1 mb-2 font-mono text-sm whitespace-nowrap
                ${isLeaf ? 'bg-muted text-muted-foreground border-dashed' : 'bg-primary/10 border-primary/20 font-bold'}
            `}>
                {node.label}
            </div>

            {!isLeaf && (
                <>
                    <div className="w-px h-4 bg-border mb-2" />
                    <div className="flex items-start">
                        {node.children!.map((child, idx) => (
                            <div key={idx} className="flex flex-col items-center">
                                {/* Connector lines could be fancy, keeping it valid CSS for now */}
                                <div className="border-t border-border w-full h-[1px] mb-2 relative top-[-1px]"
                                    style={{
                                        visibility: node.children!.length > 1 ? 'visible' : 'hidden',
                                        // Hide left/right extenders for first/last
                                        left: idx === 0 ? '50%' : 'auto',
                                        right: idx === node.children!.length - 1 ? '50%' : 'auto',
                                        width: (idx === 0 || idx === node.children!.length - 1) ? '50%' : '100%'
                                    }}
                                />
                                <TreeNode node={child} />
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
