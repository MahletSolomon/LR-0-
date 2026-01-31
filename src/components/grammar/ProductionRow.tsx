import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

import { X, Trash2, ArrowRight } from "lucide-react";
import { GrammarRow, BuildError } from "@/lib/compiler/grammar";
import React, { useRef } from "react";
import { cn } from "@/lib/utils";

interface ProductionRowProps {
    row: GrammarRow;
    index: number;
    errors: BuildError[];
    onChange: (id: string, updates: Partial<GrammarRow>) => void;
    onDelete: (id: string) => void;
}

export function ProductionRow({
    row,
    index,
    errors,
    onChange,
    onDelete,
}: ProductionRowProps) {
    const altInputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Filter errors for this row
    const rowErrors = errors.filter((e) => e.rowId === row.id);
    const lhsError = rowErrors.find((e) => e.field === "lhs");
    const rhsErrors = rowErrors.filter((e) => e.field === "rhs");

    // Highlight row if any error exists
    const hasError = rowErrors.length > 0;

    const handleLhsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(row.id, { left: e.target.value });
    };

    const handleAltChange = (altIndex: number, value: string) => {
        const newRight = [...row.right];
        newRight[altIndex] = value;
        onChange(row.id, { right: newRight });
    };

    const addAlt = (currentAltIndex: number) => {
        // Check if current alt is empty (trimmed)
        if (row.right[currentAltIndex].trim().length === 0) return;

        const newRight = [...row.right];
        // Insert after current
        newRight.splice(currentAltIndex + 1, 0, "");
        onChange(row.id, { right: newRight });

        // Focus logic needs to happen after render usually, 
        // but we can try to rely on the fact that the new input will be rendered.
        // We might need a useEffect or similar if we want to focus specifically.
        // For now, let's just update state. 
        // To focus, we might need a separate mechanism or useLayoutEffect.
        // Given simple requirement: "keep focus behavior friendly... focus moves into newly created"
        // We can try to do this by setting a focus target state or similar.
        setTimeout(() => {
            const nextInput = altInputRefs.current[currentAltIndex + 1];
            nextInput?.focus();
        }, 0);
    };

    const removeAlt = (altIndex: number) => {
        if (row.right.length <= 1) {
            // Clear if only one
            handleAltChange(altIndex, "");
            return;
        }
        const newRight = row.right.filter((_, i) => i !== altIndex);
        onChange(row.id, { right: newRight });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, altIndex: number) => {
        // Ctrl + + (or =)
        if (e.ctrlKey && (e.key === "+" || e.key === "=")) {
            e.preventDefault();
            addAlt(altIndex);
        }
    };

    return (
        <div className={cn(
            "flex flex-col gap-2 p-4 border rounded-lg bg-card text-card-foreground shadow-sm transition-colors",
            hasError && "border-destructive/50 bg-destructive/5"
        )}>
            <div className="flex items-start gap-3">
                {/* LHS */}
                <div className="w-1/4 min-w-[120px] flex flex-col gap-1">
                    <Input
                        value={row.left}
                        onChange={handleLhsChange}
                        placeholder="LHS"
                        className={cn(
                            "font-mono font-bold",
                            lhsError && "border-destructive focus-visible:ring-destructive"
                        )}
                    />
                    {lhsError && (
                        <span className="text-xs text-destructive">{lhsError.message}</span>
                    )}
                </div>

                {/* Arrowier Arrow */}
                <div className="py-2 text-muted-foreground">
                    <ArrowRight className="w-5 h-5" />
                </div>

                {/* RHS Alternatives */}
                <div className="flex-1 flex flex-wrap gap-2 items-start">
                    {row.right.map((alt, i) => {
                        const altError = rhsErrors.find(e => e.altIndex === i);
                        return (
                            <div key={i} className="flex flex-col gap-1 min-w-[150px] relative group">
                                <div className="relative">
                                    <Input
                                        ref={(el) => { altInputRefs.current[i] = el; }}
                                        value={alt}
                                        onChange={(e) => handleAltChange(i, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(e, i)}
                                        placeholder={`Alt ${i + 1}`}
                                        className={cn(
                                            "font-mono pr-8",
                                            altError && "border-destructive focus-visible:ring-destructive"
                                        )}
                                    />
                                    {row.right.length > 1 && (
                                        <button
                                            onClick={() => removeAlt(i)}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                            tabIndex={-1}
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                                {altError && (
                                    <span className="text-xs text-destructive">{altError.message}</span>
                                )}
                                <span className="text-[10px] text-muted-foreground hidden group-focus-within:block absolute -bottom-4 left-0 whitespace-nowrap">
                                    Ctrl + + to add
                                </span>
                            </div>
                        );
                    })}

                    {/* Separators are implicit in spacing/layout for now, or we could add explicit | */}

                    {row.hasEpsilon && (
                        <div className="flex items-center justify-center p-2 h-10 border border-dashed rounded bg-muted/50 text-muted-foreground font-mono select-none">
                            | ε
                        </div>
                    )}
                </div>

                {/* Action Controls */}
                <div className="flex flex-col gap-2 items-end">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(row.id)}
                        className="text-muted-foreground hover:text-destructive"
                        title="Delete Row"
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Row Footer: Epsilon Toggle */}
            <div className="flex items-center justify-end gap-2 pt-2">
                <div className="flex items-center space-x-2">
                    <Checkbox
                        id={`epsilon-${row.id}`}
                        checked={row.hasEpsilon}
                        onCheckedChange={(checked) => onChange(row.id, { hasEpsilon: checked === true })}
                    />
                    <Label htmlFor={`epsilon-${row.id}`} className="text-sm text-muted-foreground cursor-pointer">
                        Add ε
                    </Label>
                </div>
            </div>

            {hasError && !lhsError && !rhsErrors.length && (
                <div className="text-xs text-destructive mt-1">
                    {rowErrors[0].message}
                </div>
            )}
        </div>
    );
}
