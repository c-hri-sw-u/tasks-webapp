"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { Flag, GripVertical, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function SortableTaskItem({ task, section, onDelete, onEditSave, onMove, onToggleFlag }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: task.id,
        data: { type: 'Task', task, section },
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
    };

    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(task.text);
    const inputRef = useRef(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditing]);

    const handleDoubleClick = () => {
        setIsEditing(true);
        setEditText(task.text);
    };

    const handleBlur = () => {
        setIsEditing(false);
        if (editText.trim() !== task.text) {
            onEditSave(task.id, editText, section);
        } else {
            setEditText(task.text);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleBlur();
        } else if (e.key === 'Escape') {
            setIsEditing(false);
            setEditText(task.text);
        }
    };

    if (isDragging) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                className="h-10 rounded-md border-2 border-dashed border-primary/20 bg-muted"
            />
        );
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            className={cn(
                "group flex items-center gap-2 rounded-md border px-3 py-2",
                task.flagged && "border-destructive/50 bg-destructive/5"
            )}
            onDoubleClick={handleDoubleClick}
        >
            <button
                className="cursor-grab touch-none text-muted-foreground/50 hover:text-muted-foreground"
                {...listeners}
            >
                <GripVertical className="h-4 w-4" />
            </button>

            <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onToggleFlag?.(task.id, section);
                }}
                className={cn(
                    "text-muted-foreground/50 hover:text-destructive",
                    task.flagged && "text-destructive"
                )}
            >
                <Flag className={cn("h-4 w-4", task.flagged && "fill-current")} />
            </button>

            {isEditing ? (
                <Input
                    ref={inputRef}
                    type="text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    className="h-7 flex-1 text-sm"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                />
            ) : (
                <span className="flex-1 text-sm">{task.text}</span>
            )}

            <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete(task.id);
                }}
            >
                <Trash2 className="h-3.5 w-3.5" />
            </Button>
        </div>
    );
}
