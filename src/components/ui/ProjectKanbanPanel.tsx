import React, { useState } from 'react';
import KanbanBoard from '../kanban/KanbanBoard';
import TaskDrawer from '../kanban/TaskDrawer';
import { useKanbanTasks, useUpdateTask, useLogTime, type KanbanTask } from '@/services/tasksService';
import Loader from './Loader';

interface ProjectKanbanPanelProps {
  projectId: string;
}

const ProjectKanbanPanel: React.FC<ProjectKanbanPanelProps> = ({ projectId }) => {
  const { data: tasks = [], isLoading } = useKanbanTasks(projectId);
  const updateTaskMutation = useUpdateTask(projectId);
  const [selectedTask, setSelectedTask] = useState<KanbanTask | null>(null);
  const logTimeMutation = useLogTime(selectedTask?.id ?? null);

  const handleUpdateTask = (taskId: string, updates: Partial<KanbanTask>) => {
    updateTaskMutation.mutate({ taskId, updates });
  };

  const handleLogTime = (taskId: string, seconds: number) => {
    logTimeMutation.mutate({ seconds });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-10">
        <Loader size={32} />
      </div>
    );
  }

  return (
    <>
      <KanbanBoard
        tasks={tasks}
        onUpdateTask={handleUpdateTask}
        onLogTime={handleLogTime}
        onSelectTask={setSelectedTask}
      />
      <TaskDrawer
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onUpdateTask={handleUpdateTask}
      />
    </>
  );
};

export default ProjectKanbanPanel;
