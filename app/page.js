"use client";

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import SortableTaskItem from '@/components/SortableTaskItem';
import KanbanColumn from '@/components/KanbanColumn';
import TrashZone from '@/components/TrashZone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ThemeSwitcher } from '@/components/ui/theme-switcher';
import {
  CalendarDays,
  Moon,
  Clock,
  ListChecks,
  Plus,
  ArrowLeft,
  CheckCircle2,
  Circle,
  Trash2,
  Loader2,
  CheckSquare
} from 'lucide-react';

export default function Home() {
  const [view, setView] = useState('today');
  const [tasks, setTasks] = useState({ backlog: [], inProgress: [], done: [] });
  const tasksRef = useRef(tasks);
  const [botTasks, setBotTasks] = useState([]);
  const [tomorrowTasks, setTomorrowTasks] = useState([]);
  const [weeklyTasks, setWeeklyTasks] = useState([]);
  const [archivedDates, setArchivedDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [historyTasks, setHistoryTasks] = useState(null);
  const [newTask, setNewTask] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    fetchData();
  }, [view, selectedDate]);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (view === 'today') {
        await fetchTodayData();
      } else if (view === 'night') {
        await fetchNightData();
      } else if (view === 'history') {
        if (!selectedDate) {
          await fetchArchivedDates();
        } else {
          await fetchHistoryData(selectedDate);
        }
      } else if (view === 'weekly') {
        await fetchWeeklyData();
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setError('Failed to load data, please refresh and try again');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTodayData = async () => {
    const data = await api.getTasks('today');
    setTasks(data.tasks || { backlog: [], inProgress: [], done: [] });
    setTomorrowTasks(data.tomorrowTasks || []);
  };

  const fetchNightData = async () => {
    const data = await api.getTasks('night');
    setBotTasks(data.botTasks || []);
    setTomorrowTasks(data.tomorrowTasks || []);
  };

  const fetchArchivedDates = async () => {
    const data = await api.getHistory();
    setArchivedDates(data.dates || []);
    setHistoryTasks(null);
  };

  const fetchHistoryData = async (date) => {
    const data = await api.getHistory(date);
    setHistoryTasks(data);
  };

  const fetchWeeklyData = async () => {
    const data = await api.getTasks('weekly');
    setWeeklyTasks(data.tasks || []);
  };

  const findTask = (id) => {
    if (tasks.backlog.find(t => t.id === id)) return tasks.backlog.find(t => t.id === id);
    if (tasks.inProgress.find(t => t.id === id)) return tasks.inProgress.find(t => t.id === id);
    if (tasks.done.find(t => t.id === id)) return tasks.done.find(t => t.id === id);
    return null;
  };

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragOver = (event) => {
    const { active, over } = event;
    const overId = over?.id;

    if (!overId || active.id === overId) return;

    setTasks((prev) => {
      const isOverColumn = overId in prev;

      let activeSection = null;
      let activeIndex = -1;
      for (const section of ['backlog', 'inProgress', 'done']) {
        const idx = prev[section].findIndex(t => t.id === active.id);
        if (idx !== -1) {
          activeSection = section;
          activeIndex = idx;
          break;
        }
      }

      if (!activeSection || activeIndex === -1) return prev;

      let overSection = null;
      let overIndex = -1;

      if (isOverColumn) {
        overSection = overId;
      } else {
        for (const section of ['backlog', 'inProgress', 'done']) {
          const idx = prev[section].findIndex(t => t.id === overId);
          if (idx !== -1) {
            overSection = section;
            overIndex = idx;
            break;
          }
        }
      }

      if (!overSection) return prev;

      const activeTask = prev[activeSection][activeIndex];

      if (activeSection === overSection && !isOverColumn) {
        if (overIndex === -1 || activeIndex === overIndex) return prev;

        const newItems = arrayMove(prev[activeSection], activeIndex, overIndex);
        const newTasks = { ...prev, [activeSection]: newItems };
        tasksRef.current = newTasks;
        return newTasks;
      }

      let newIndex;
      if (isOverColumn || overIndex === -1) {
        newIndex = prev[overSection].length;
      } else {
        const isBelowOverItem =
          over && active.rect.current.translated &&
          active.rect.current.translated.top > over.rect.top + over.rect.height;
        newIndex = overIndex + (isBelowOverItem ? 1 : 0);
      }

      const newSourceItems = prev[activeSection].filter(item => item.id !== active.id);
      const newTargetItems = [...prev[overSection]];

      if (activeSection === overSection) {
        newTargetItems.splice(newIndex, 0, activeTask);
        const newTasks = { ...prev, [activeSection]: newTargetItems };
        tasksRef.current = newTasks;
        return newTasks;
      }

      newTargetItems.splice(newIndex, 0, activeTask);

      const newTasks = {
        ...prev,
        [activeSection]: newSourceItems,
        [overSection]: newTargetItems,
      };

      tasksRef.current = newTasks;
      return newTasks;
    });
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    const activeId = active.id;
    const overId = over?.id;

    setActiveId(null);

    if (overId === 'trash') {
      await deleteTask(activeId);
      return;
    }

    const currentTasks = tasksRef.current;
    let endSection = null;
    let endIndex = -1;

    for (const section of ['backlog', 'inProgress', 'done']) {
      const index = currentTasks[section].findIndex(t => t.id === activeId);
      if (index !== -1) {
        endSection = section;
        endIndex = index;
        break;
      }
    }

    if (endSection && endIndex !== -1) {
      try {
        await api.updateTask(activeId, { status: endSection, newIndex: endIndex });
      } catch (e) {
        console.error('Persist failed', e);
        fetchTodayData();
      }
    }
  };

  const addTask = async (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    setIsSubmitting(true);
    try {
      await api.addTask(newTask, 'backlog');
      setNewTask('');
      await fetchTodayData();
    } catch (error) {
      setError('Failed to add task, please try again');
    } finally {
      setIsSubmitting(false);
    }
  };

  const moveTask = async (taskId, newStatus) => {
    setIsSubmitting(true);
    try {
      await api.updateTask(taskId, { status: newStatus });
      await fetchTodayData();
    } catch (error) {
      setError('Failed to move task, please try again');
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteTask = async (taskId) => {
    setIsSubmitting(true);
    try {
      await api.deleteTask(taskId);
      await fetchTodayData();
    } catch (error) {
      setError('Failed to delete task, please try again');
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveEdit = async (taskId, newText, section) => {
    if (!newText.trim()) return;

    setTasks(prev => ({
      ...prev,
      [section]: prev[section].map(t => t.id === taskId ? { ...t, text: newText } : t)
    }));

    try {
      await api.updateTask(taskId, { text: newText });
    } catch (error) {
      setError('Failed to update task, please try again');
      await fetchTodayData();
    }
  };

  const toggleFlag = async (taskId, section) => {
    setTasks(prev => {
      const newTasks = {
        ...prev,
        [section]: prev[section].map(t => t.id === taskId ? { ...t, flagged: !t.flagged } : t)
      };
      tasksRef.current = newTasks;
      return newTasks;
    });

    try {
      const task = tasks[section].find(t => t.id === taskId);
      await api.updateTask(taskId, { flagged: !task?.flagged });
    } catch (error) {
      await fetchTodayData();
    }
  };

  const toggleWeeklyTask = async (taskId) => {
    try {
      await api.updateTask(taskId, {}, 'weekly');
      await fetchWeeklyData();
    } catch (error) {
      setError('Failed to toggle task status, please try again');
    }
  };

  const addWeeklyTask = async (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    setIsSubmitting(true);
    try {
      await api.addTask(newTask, 'backlog', 'weekly');
      setNewTask('');
      await fetchWeeklyData();
    } catch (error) {
      setError('Failed to add task, please try again');
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteWeeklyTask = async (taskId) => {
    try {
      await api.deleteTask(taskId, 'weekly');
      await fetchWeeklyData();
    } catch (error) {
      setError('Failed to delete task, please try again');
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="flex items-center space-x-2">
            <CheckSquare className="h-6 w-6" />
            <span className="font-bold">Task Manager</span>
          </div>
          <div className="flex flex-1 items-center justify-end space-x-2">
            <ThemeSwitcher />
          </div>
        </div>
      </header>

      <main className="container py-6">
        {/* Navigation Tabs */}
        <Tabs value={view} onValueChange={(v) => { setView(v); setSelectedDate(null); }} className="mb-6">
          <TabsList className="grid w-full max-w-md grid-cols-4">
            <TabsTrigger value="today" className="text-xs sm:text-sm">
              <CalendarDays className="mr-1.5 h-4 w-4" />
              <span className="hidden sm:inline">Today</span>
            </TabsTrigger>
            <TabsTrigger value="night" className="text-xs sm:text-sm">
              <Moon className="mr-1.5 h-4 w-4" />
              <span className="hidden sm:inline">Sleep</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs sm:text-sm">
              <Clock className="mr-1.5 h-4 w-4" />
              <span className="hidden sm:inline">History</span>
            </TabsTrigger>
            <TabsTrigger value="weekly" className="text-xs sm:text-sm">
              <ListChecks className="mr-1.5 h-4 w-4" />
              <span className="hidden sm:inline">Weekly</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {error && (
          <div className="mb-6 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Today View */}
        {view === 'today' && (
          <div className="space-y-6">
            <form onSubmit={addTask} className="flex gap-2">
              <Input
                type="text"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder="Add new task..."
                disabled={isSubmitting}
                className="max-w-md"
              />
              <Button type="submit" disabled={isSubmitting || !newTask.trim()}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                <span className="ml-1.5 hidden sm:inline">Add</span>
              </Button>
            </form>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <TrashZone isVisible={!!activeId} />

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 items-start">
                {/* Yesterday's Plan */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Last Night's Plan</CardTitle>
                    <CardDescription>{tomorrowTasks.length} Tasks</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {tomorrowTasks.length === 0 ? (
                      <p className="py-4 text-center text-sm text-muted-foreground">No plans</p>
                    ) : (
                      tomorrowTasks.map(task => (
                        <div key={task.id} className="group flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                          <span>{task.text}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100"
                            onClick={() => deleteTask(task.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                <KanbanColumn
                  id="backlog"
                  title="To Do"
                  tasks={tasks.backlog}
                  onDelete={deleteTask}
                  onEditSave={saveEdit}
                  onMove={moveTask}
                  onToggleFlag={toggleFlag}
                  variant="default"
                />

                <KanbanColumn
                  id="inProgress"
                  title="In Progress"
                  tasks={tasks.inProgress}
                  onDelete={deleteTask}
                  onEditSave={saveEdit}
                  onMove={moveTask}
                  onToggleFlag={toggleFlag}
                  variant="warning"
                />

                <KanbanColumn
                  id="done"
                  title="Done"
                  tasks={tasks.done}
                  onDelete={deleteTask}
                  onEditSave={saveEdit}
                  onMove={moveTask}
                  onToggleFlag={toggleFlag}
                  variant="success"
                />
              </div>

              <DragOverlay>
                {activeId ? (
                  <div className="rounded-md border bg-card px-3 py-2 text-sm shadow-lg">
                    {findTask(activeId)?.text}
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        )}

        {/* Night View */}
        {view === 'night' && (
          <Card className="mx-auto max-w-2xl">
            <CardHeader>
              <CardTitle>What can I do for you while you sleep?</CardTitle>
              <CardDescription>tasks collected last night, I will complete them while you sleep</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {botTasks.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">No sleep tasks</p>
              ) : (
                botTasks.map(task => (
                  <div key={task.id} className="flex items-center justify-between rounded-md border px-4 py-3">
                    <span className="text-sm">{task.text}</span>
                    <Badge variant={task.done ? "default" : "secondary"}>
                      {task.done ? "Done" : "Pending"}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}

        {/* History View */}
        {view === 'history' && (
          <>
            {!selectedDate ? (
              <Card className="mx-auto max-w-3xl">
                <CardHeader>
                  <CardTitle>History Records</CardTitle>
                  <CardDescription>View past task completion history</CardDescription>
                </CardHeader>
                <CardContent>
                  {archivedDates.length === 0 ? (
                    <p className="py-8 text-center text-muted-foreground">No history records</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                      {archivedDates.map(date => (
                        <Button
                          key={date}
                          variant="outline"
                          className="justify-start"
                          onClick={() => setSelectedDate(date)}
                        >
                          {date}
                        </Button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : historyTasks && (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedDate(null)}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <div>
                    <h2 className="text-lg font-semibold">{selectedDate}</h2>
                    <p className="text-sm text-muted-foreground">History Records (Read Only)</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  {['backlog', 'inProgress', 'done'].map((section) => {
                    const titles = { backlog: 'Backlog', inProgress: 'In Progress', done: 'Done' };
                    const items = historyTasks.tasks?.[section] || [];
                    return (
                      <Card key={section}>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-medium">{titles[section]}</CardTitle>
                          <CardDescription>{items.length} items</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {items.map(task => (
                            <div key={task.id} className="rounded-md border px-3 py-2 text-sm">
                              {task.text}
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* Weekly View */}
        {view === 'weekly' && (
          <div className="mx-auto max-w-2xl space-y-6">


            <form onSubmit={addWeeklyTask} className="flex gap-2">
              <Input
                type="text"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder="Add weekly task..."
                disabled={isSubmitting}
                className="flex-1"
              />
              <Button type="submit" disabled={isSubmitting || !newTask.trim()}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                <span className="ml-1.5">Add</span>
              </Button>
            </form>

            <Card>
              <CardContent className="divide-y pt-6">
                {weeklyTasks.length === 0 ? (
                  <p className="py-8 text-center text-muted-foreground">No weekly plans</p>
                ) : (
                  weeklyTasks.map(task => (
                    <div key={task.id} className="group flex items-center gap-3 py-3">
                      <button
                        onClick={() => toggleWeeklyTask(task.id)}
                        className="flex-shrink-0"
                        disabled={isSubmitting}
                      >
                        {task.done ? (
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </button>
                      <span className={cn("flex-1 text-sm", task.done && "text-muted-foreground line-through")}>
                        {task.text}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100"
                        onClick={() => deleteWeeklyTask(task.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
