"use client";

import { useState, useEffect } from 'react';
import { cn } from '../lib/utils';

export default function Home() {
  const [tasks, setTasks] = useState({ backlog: [], inProgress: [], done: [] });
  const [newTask, setNewTask] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/tasks');
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }
      const data = await response.json();
      setTasks(data);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      setError('加载任务失败，请刷新页面重试');
    } finally {
      setIsLoading(false);
    }
  };

  const addTask = async (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newTask, status: 'backlog' })
      });
      if (!response.ok) {
        throw new Error('Failed to add task');
      }
      setNewTask('');
      await fetchTasks();
    } catch (error) {
      console.error('Failed to add task:', error);
      setError('添加任务失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const moveTask = async (taskId, newStatus) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, status: newStatus })
      });
      if (!response.ok) {
        throw new Error('Failed to move task');
      }
      await fetchTasks();
    } catch (error) {
      console.error('Failed to move task:', error);
      setError('移动任务失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteTask = async (taskId) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/tasks?taskId=${taskId}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        throw new Error('Failed to delete task');
      }
      await fetchTasks();
    } catch (error) {
      console.error('Failed to delete task:', error);
      setError('删除任务失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const TaskColumn = ({ title, tasks, status, color }) => (
    <section
      className={cn(
        'column',
        color === 'blue' && 'column-blue',
        color === 'orange' && 'column-orange',
        color === 'green' && 'column-green'
      )}
      aria-labelledby={`column-${status}`}
    >
      <h2 id={`column-${status}`} className="column-title">
        {title}
        <span className="task-count" aria-hidden="true">{tasks.length}</span>
      </h2>
      <ul className="task-list" role="list">
        {tasks.map((task) => (
          <li key={task.id} className="task-item">
            <span className="task-text">{task.text}</span>
            <div className="task-actions" role="group" aria-label="任务操作">
              {status !== 'backlog' && (
                <button
                  onClick={() => moveTask(task.id, 'backlog')}
                  title="移至待办"
                  aria-label="移至待办"
                  disabled={isSubmitting}
                >
                  ←
                </button>
              )}
              {status === 'backlog' && (
                <button
                  onClick={() => moveTask(task.id, 'inProgress')}
                  title="移至进行中"
                  aria-label="移至进行中"
                  disabled={isSubmitting}
                >
                  →
                </button>
              )}
              {status === 'inProgress' && (
                <button
                  onClick={() => moveTask(task.id, 'done')}
                  title="移至已完成"
                  aria-label="移至已完成"
                  disabled={isSubmitting}
                >
                  ✓
                </button>
              )}
              {status === 'done' && (
                <button
                  onClick={() => moveTask(task.id, 'inProgress')}
                  title="移至进行中"
                  aria-label="移至进行中"
                  disabled={isSubmitting}
                >
                  ←
                </button>
              )}
              <button
                onClick={() => deleteTask(task.id)}
                title="删除任务"
                aria-label="删除任务"
                className="delete-btn"
                disabled={isSubmitting}
              >
                ×
              </button>
            </div>
          </li>
        ))}
        {tasks.length === 0 && (
          <li className="empty-state" aria-hidden="true">
            暂无任务
          </li>
        )}
      </ul>
    </section>
  );

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-skeleton" aria-busy="true" aria-label="加载任务中">
          <div className="skeleton-text skeleton-title" />
          <div className="skeleton-form">
            <div className="skeleton-input" />
            <div className="skeleton-button" />
          </div>
          <div className="skeleton-board">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton-column">
                <div className="skeleton-column-header" />
                {[1, 2, 3].map((j) => (
                  <div key={j} className="skeleton-task" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="container">
      <h1 className="page-title">Task Manager</h1>

      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={addTask} className="add-task-form">
        <label htmlFor="new-task" className="sr-only">添加新任务</label>
        <input
          id="new-task"
          type="text"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="添加新任务..."
          disabled={isSubmitting}
          aria-describedby="task-help"
        />
        <span id="task-help" className="sr-only">
          按 Enter 键或点击按钮添加任务到待办列表
        </span>
        <button type="submit" disabled={isSubmitting || !newTask.trim()}>
          {isSubmitting ? '添加中...' : '添加任务'}
        </button>
      </form>

      <div className="board">
        <TaskColumn title="📋 待办" tasks={tasks.backlog} status="backlog" color="blue" />
        <TaskColumn title="🚀 进行中" tasks={tasks.inProgress} status="inProgress" color="orange" />
        <TaskColumn title="✅ 已完成" tasks={tasks.done} status="done" color="green" />
      </div>
    </main>
  );
}
