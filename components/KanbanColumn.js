"use client";

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableTaskItem from './SortableTaskItem';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function KanbanColumn({
    id,
    title,
    tasks,
    onDelete,
    onEditSave,
    onMove,
    onToggleFlag,
    variant = 'default'
}) {
    const { setNodeRef } = useDroppable({ id });

    return (
        <Card ref={setNodeRef}>
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <CardDescription>{tasks.length} tasks</CardDescription>
            </CardHeader>
            <CardContent>
                <SortableContext
                    id={id}
                    items={tasks.map(t => t.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="space-y-2 min-h-[40px]">
                        {tasks.length === 0 ? (
                            <p className="py-4 text-center text-sm text-muted-foreground">No tasks</p>
                        ) : (
                            tasks.map(task => (
                                <SortableTaskItem
                                    key={task.id}
                                    task={task}
                                    section={id}
                                    onDelete={onDelete}
                                    onEditSave={onEditSave}
                                    onMove={onMove}
                                    onToggleFlag={onToggleFlag}
                                />
                            ))
                        )}
                    </div>
                </SortableContext>
            </CardContent>
        </Card>
    );
}
