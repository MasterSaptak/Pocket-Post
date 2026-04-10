'use client';

import { motion } from 'motion/react';
import { TaskCard, TaskData } from './task-card';

interface TaskListProps {
  tasks: TaskData[];
  showApply?: boolean;
  showFollow?: boolean;
  onLike?: (id: string) => void;
  onApply?: (id: string) => void;
  onAction?: (action: string, task: TaskData) => void;
  applyingId?: string | null;
  appliedIds?: Set<string>;
}

export function TaskList({
  tasks,
  showApply,
  showFollow,
  onLike,
  onApply,
  onAction,
  applyingId,
  appliedIds,
}: TaskListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-4">
      {tasks.map((task, index) => (
        <motion.div
          key={task.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.5) }}
        >
          <TaskCard
            task={task}
            showApplyButton={showApply}
            showFollowButton={showFollow}
            onLike={onLike}
            onApply={onApply}
            onAction={onAction}
            isApplying={applyingId === task.id}
            hasApplied={appliedIds?.has(task.id)}
          />
        </motion.div>
      ))}
    </div>
  );
}
