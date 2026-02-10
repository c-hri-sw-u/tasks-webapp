import { promises as fs } from 'fs';
import path from 'path';
import { formatDate, parseDate } from '../../../lib/date-utils';

const TASKS_DIR = '/Users/mia/.openclaw/workspace/tasks/daily/day_track';
const ARCHIVED_DIR = '/Users/mia/.openclaw/workspace/tasks/daily/archived';
const NIGHT_CHECK_DIR = '/Users/mia/.openclaw/workspace/tasks/daily/night_check';
const WEEKLY_PLAN_FILE = '/Users/mia/.openclaw/workspace/tasks/weekly/plan.md';

// Get today's date in YYYY-MM-DD format
function getTodayDate() {
  return formatDate(new Date());
}

// Check if a date is in the past
function isPastDate(dateStr) {
  const date = parseDate(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

// Check if a date is tomorrow
function isTomorrow(dateStr) {
  const date = parseDate(dateStr);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return date.toDateString() === tomorrow.toDateString();
}

// Get tasks for a specific date
async function getTasksForDate(date) {
  // Try day_track first
  const dayTrackFile = path.join(TASKS_DIR, `${date}.md`);
  try {
    const content = await fs.readFile(dayTrackFile, 'utf-8');
    return { content, source: 'day_track' };
  } catch (error) {
    // File doesn't exist in day_track
  }

  // Try archived folder
  const archivedFile = path.join(ARCHIVED_DIR, date, 'day_track.md');
  try {
    const content = await fs.readFile(archivedFile, 'utf-8');
    return { content, source: 'archived' };
  } catch (error) {
    // File doesn't exist in archived
  }

  // Return empty result
  return { content: null, source: null };
}

// Initialize tasks file if it doesn't exist
async function initTasksFile(date) {
  const filePath = path.join(TASKS_DIR, `${date}.md`);
  try {
    await fs.access(filePath);
  } catch {
    const initialContent = `# ${date} Task Tracker

## 📋 Backlog

## 🚀 In Progress

## ✅ Done

## 💤 Sleep Background Tasks
`;
    await fs.writeFile(filePath, initialContent);
  }
  return filePath;
}

// Parse tasks from Markdown
function parseTasks(content) {
  const sections = {
    backlog: [],
    inProgress: [],
    done: []
  };

  const lines = content.split('\n');
  let currentSection = null;

  for (const line of lines) {
    if (line.startsWith('## 📋 Backlog')) {
      currentSection = 'backlog';
    } else if (line.startsWith('## 🚀 In Progress')) {
      currentSection = 'inProgress';
    } else if (line.startsWith('## ✅ Done')) {
      currentSection = 'done';
    } else if (line.startsWith('- [') && currentSection) {
      const idMatch = line.match(/\[#([a-zA-Z0-9_-]+)\]/);
      const id = idMatch ? idMatch[1] : Date.now().toString();
      const text = line.replace(/^- \[[ x]\] \[#([a-zA-Z0-9_-]+)\] /, '').trim();
      const isDone = line.includes('- [x]');

      sections[currentSection].push({ id, text, done: isDone });
    }
  }

  return sections;
}

// Parse weekly plan from Markdown
function parseWeeklyPlan(content) {
  const tasks = [];

  const lines = content.split('\n');
  let inPlanSection = false;

  for (const line of lines) {
    if (line.startsWith('# 📅 Weekly Plan')) {
      inPlanSection = true;
      continue;
    }

    if (line.startsWith('##')) {
      inPlanSection = false;
    }

    if (inPlanSection && line.startsWith('- [') && !line.includes('*(This file') && !line.includes('*(此文件')) {
      const idMatch = line.match(/\[#([a-zA-Z0-9_-]+)\]/);
      const id = idMatch ? idMatch[1] : Date.now().toString();
      const text = line.replace(/^- \[[ x]\] \[#([a-zA-Z0-9_-]+)\] /, '').trim();
      const isDone = line.includes('- [x]');

      tasks.push({ id, text, done: isDone });
    }
  }

  return { backlog: tasks, inProgress: [], done: [] };
}

// Parse plan.md as tasks (for tomorrow preview)
function parsePlanAsTasks(content) {
  const tasks = [];
  const lines = content.split('\n');
  let inPlanSection = false;

  for (const line of lines) {
    if (line.startsWith('# 📋 Tomorrow\'s Plan')) {
      inPlanSection = true;
      continue;
    }

    if (line.startsWith('##')) {
      inPlanSection = false;
    }

    if (inPlanSection && line.startsWith('- [') && !line.includes('*(This file') && !line.includes('*(此文件')) {
      const idMatch = line.match(/\[#([a-zA-Z0-9_-]+)\]/);
      const id = idMatch ? idMatch[1] : Date.now().toString();
      const text = line.replace(/^- \[[ x]\] \[#([a-zA-Z0-9_-]+)\] /, '').trim();
      const isDone = line.includes('- [x]');

      tasks.push({ id, text, done: isDone });
    }
  }

  return { backlog: tasks, inProgress: [], done: [] };
}

// Generate tasks Markdown (preserve sections)
function generateTasksMarkdown(content, sections) {
  const lines = content.split('\n');
  let output = [];
  let currentSection = null;

  for (const line of lines) {
    if (line.startsWith('## 📋 Backlog')) {
      currentSection = 'backlog';
      output.push(line);
      output.push('');
      for (const task of sections.backlog) {
        output.push(`- [ ] [#${task.id}] ${task.text}`);
      }
    } else if (line.startsWith('## 🚀 In Progress')) {
      currentSection = 'inProgress';
      output.push(line);
      output.push('');
      for (const task of sections.inProgress) {
        output.push(`- [ ] [#${task.id}] ${task.text}`);
      }
    } else if (line.startsWith('## ✅ Done')) {
      currentSection = 'done';
      output.push(line);
      output.push('');
      for (const task of sections.done) {
        output.push(`- [x] [#${task.id}] ${task.text}`);
      }
    } else if (line.startsWith('- [') && currentSection) {
      // Skip old task lines (they'll be replaced by the sections above)
    } else {
      output.push(line);
    }
  }

  return output.join('\n');
}

// Append to weekly plan
function appendToWeeklyPlan(content, text) {
  const id = Date.now().toString();
  const newTask = `- [ ] [#${id}] ${text}`;

  // Find the last line before any new section or end of file
  const lines = content.split('\n');
  const insertionIndex = lines.findIndex(line => line.startsWith('##'));
  const insertAt = insertionIndex === -1 ? lines.length : insertionIndex;

  lines.splice(insertAt, 0, newTask);
  return lines.join('\n');
}

// Generate weekly plan template
function generateWeeklyPlanTemplate(text) {
  const id = Date.now().toString();
  return `# 📅 Weekly Plan

*(This file is automatically generated by Weekly Check)*

- [ ] [#${id}] ${text}
`;
}

// GET - Fetch all tasks
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const view = searchParams.get('view') || 'daily';
  const date = searchParams.get('date') || getTodayDate();

  if (view === 'weekly') {
    // Fetch weekly plan
    try {
      const content = await fs.readFile(WEEKLY_PLAN_FILE, 'utf-8');
      const tasks = parseWeeklyPlan(content);
      return Response.json({ tasks, view: 'weekly' });
    } catch (error) {
      // File doesn't exist or empty
      return Response.json({ tasks: [], view: 'weekly' });
    }
  }

  if (view === 'achieved') {
    // Fetch all archived done tasks
    return Response.json({ tasks: [], view: 'achieved' });
  }

  // Daily view
  const today = getTodayDate();

  // If it's today, use the main day_track file
  if (date === today) {
    const filePath = await initTasksFile(date);
    const content = await fs.readFile(filePath, 'utf-8');
    const tasks = parseTasks(content);
    return Response.json({ tasks, view: 'daily', date, source: 'day_track' });
  }

  // If it's in the past, try archived
  if (isPastDate(date)) {
    // First check if file exists in day_track (shouldn't, but just in case)
    const dayTrackFile = path.join(TASKS_DIR, `${date}.md`);
    try {
      const content = await fs.readFile(dayTrackFile, 'utf-8');
      const tasks = parseTasks(content);
      return Response.json({ tasks, view: 'daily', date, source: 'day_track' });
    } catch (error) {
      // Not in day_track, try archived
    }

    // Try archived folder
    const archivedFile = path.join(ARCHIVED_DIR, date, 'day_track.md');
    try {
      const content = await fs.readFile(archivedFile, 'utf-8');
      const tasks = parseTasks(content);
      return Response.json({ tasks, view: 'daily', date, source: 'archived' });
    } catch (error) {
      // No archived file found
      return Response.json({
        tasks: { backlog: [], inProgress: [], done: [] },
        view: 'daily',
        date,
        source: 'none',
        message: 'No task records for this date'
      });
    }
  }

  // If it's in the future
  if (isTomorrow(date)) {
    // Try to read plan.md for tomorrow preview
    const planFile = path.join(NIGHT_CHECK_DIR, 'plan.md');
    try {
      const content = await fs.readFile(planFile, 'utf-8');
      const tasks = parsePlanAsTasks(content);
      return Response.json({
        tasks,
        view: 'daily',
        date,
        source: 'plan_preview',
        message: 'Tomorrow\'s plan (from last night\'s plan.md)'
      });
    } catch (error) {
      // Plan doesn't exist
      return Response.json({
        tasks: { backlog: [], inProgress: [], done: [] },
        view: 'daily',
        date,
        source: 'none',
        message: 'Tomorrow\'s plan not set'
      });
    }
  }

  // Future dates beyond tomorrow
  return Response.json({
    tasks: { backlog: [], inProgress: [], done: [] },
    view: 'daily',
    date,
    source: 'none',
    message: 'Future date'
  });
}

// POST - Add a new task
export async function POST(request) {
  const { text, status, view = 'daily', date = getTodayDate() } = await request.json();

  if (view === 'weekly') {
    // Weekly plan
    try {
      const content = await fs.readFile(WEEKLY_PLAN_FILE, 'utf-8');
      const newContent = appendToWeeklyPlan(content, text);
      await fs.writeFile(WEEKLY_PLAN_FILE, newContent);
      return Response.json({ success: true });
    } catch (error) {
      const newContent = generateWeeklyPlanTemplate(text);
      await fs.writeFile(WEEKLY_PLAN_FILE, newContent);
      return Response.json({ success: true });
    }
  }

  // Daily view - only allow adding to today's tasks
  const today = getTodayDate();
  if (date !== today) {
    return Response.json({
      success: false,
      error: 'Can only add tasks for today'
    }, { status: 400 });
  }

  const filePath = await initTasksFile(date);
  const content = await fs.readFile(filePath, 'utf-8');
  const tasks = parseTasks(content);

  const newTask = {
    id: Date.now().toString(),
    text,
    done: false
  };

  tasks[status].push(newTask);
  const newContent = generateTasksMarkdown(content, tasks);

  await fs.writeFile(filePath, newContent);
  return Response.json({ success: true, task: newTask });
}

// PUT - Update task status
export async function PUT(request) {
  const { taskId, status, view = 'daily', date = getTodayDate() } = await request.json();

  if (view === 'weekly') {
    // Weekly plan - toggle task status
    try {
      const content = await fs.readFile(WEEKLY_PLAN_FILE, 'utf-8');
      const lines = content.split('\n');
      let updated = false;

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(`[#${taskId}]`)) {
          lines[i] = lines[i].replace(/^- \[([ x])\]/, (match, checked) => {
            return `- [${checked === 'x' ? ' ' : 'x'}]`;
          });
          updated = true;
          break;
        }
      }

      if (updated) {
        await fs.writeFile(WEEKLY_PLAN_FILE, lines.join('\n'));
        return Response.json({ success: true });
      }
    } catch (error) {
      return Response.json({ success: false, error: 'Task not found' }, { status: 404 });
    }
  }

  // Daily view - only allow editing today's tasks
  const today = getTodayDate();
  if (date !== today) {
    return Response.json({
      success: false,
      error: 'Can only edit tasks for today'
    }, { status: 400 });
  }

  const filePath = await initTasksFile(date);
  const content = await fs.readFile(filePath, 'utf-8');
  const tasks = parseTasks(content);

  // Find and move the task
  let foundTask = null;
  for (const section of ['backlog', 'inProgress', 'done']) {
    const taskIndex = tasks[section].findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
      foundTask = tasks[section].splice(taskIndex, 1)[0];
      break;
    }
  }

  if (foundTask) {
    tasks[status].push(foundTask);
    const newContent = generateTasksMarkdown(content, tasks);
    await fs.writeFile(filePath, newContent);
    return Response.json({ success: true });
  }

  return Response.json({ success: false, error: 'Task not found' }, { status: 404 });
}

// DELETE - Remove a task
export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get('taskId');
  const view = searchParams.get('view') || 'daily';
  const date = searchParams.get('date') || getTodayDate();

  if (view === 'weekly') {
    // Weekly plan
    try {
      const content = await fs.readFile(WEEKLY_PLAN_FILE, 'utf-8');
      const lines = content.filter(line => !line.includes(`[#${taskId}]`));
      await fs.writeFile(WEEKLY_PLAN_FILE, lines.join('\n'));
      return Response.json({ success: true });
    } catch (error) {
      return Response.json({ success: false, error: 'Task not found' }, { status: 404 });
    }
  }

  // Daily view - only allow deleting today's tasks
  const today = getTodayDate();
  if (date !== today) {
    return Response.json({
      success: false,
      error: 'Can only delete tasks for today'
    }, { status: 400 });
  }

  const filePath = await initTasksFile(date);
  const content = await fs.readFile(filePath, 'utf-8');
  const tasks = parseTasks(content);

  let found = false;
  for (const section of ['backlog', 'inProgress', 'done']) {
    const taskIndex = tasks[section].findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
      tasks[section].splice(taskIndex, 1);
      found = true;
      break;
    }
  }

  if (found) {
    const newContent = generateTasksMarkdown(content, tasks);
    await fs.writeFile(filePath, newContent);
    return Response.json({ success: true });
  }

  return Response.json({ success: false, error: 'Task not found' }, { status: 404 });
}
