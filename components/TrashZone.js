"use client";

import { useDroppable } from '@dnd-kit/core';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TrashZone({ isVisible }) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'trash',
  });

  if (!isVisible) return null;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "fixed top-12 right-8 z-50 flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed transition-colors",
        isOver
          ? "border-destructive bg-destructive text-destructive-foreground scale-110"
          : "border-destructive/50 bg-destructive/10 text-destructive"
      )}
    >
      <Trash2 className="h-6 w-6" />
    </div>
  );
}
