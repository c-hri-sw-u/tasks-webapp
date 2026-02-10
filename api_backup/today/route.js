import { promises as fs } from 'fs';
import path from 'path';
import { formatDate } from '../../../lib/date-utils';

const TASKS_DIR = '/Users/mia/.openclaw/workspace/tasks/daily/day_track';
const NIGHT_CHECK_DIR = '/Users/mia/.openclaw/workspace/tasks/daily/night_check';

// Get today's date
function getTodayDate() {
  return formatDate(new Date());
}

// Parse tasks from markdown
function parseTasks(content) {
  const sections = { backlog: [], inProgress: [], done: [] };
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
      let text = line.replace(/^- \[[ x]\] \[#([a-zA-Z0-9_-]+)\] /, '').trim();
      const isDone = line.includes('- [x]');
      const isFlagged = text.startsWith('🚩 ');
      if (isFlagged) {
        text = text.replace(/^🚩 /, '');
      }
      sections[currentSection].push({ id, text, done: isDone, flagged: isFlagged });
    }
  }

  return sections;
}

// Parse simple list from markdown
function parseSimpleList(content, sectionStart) {
  const tasks = [];
  const lines = content.split('\n');
  let inSection = false;

  for (const line of lines) {
    if (line.startsWith(sectionStart)) {
      inSection = true;
      continue;
    }

    if (line.startsWith('##') && inSection) {
      break;
    }

    if (inSection && line.startsWith('- [') && !line.includes('*(This file') && !line.includes('*(此文件')) {
      const idMatch = line.match(/\[#([a-zA-Z0-9_-]+)\]/);
      const id = idMatch ? idMatch[1] : Date.now().toString();
      const text = line.replace(/^- \[[ x]\] \[#([a-zA-Z0-9_-]+)\] /, '').trim();
      const isDone = line.includes('- [x]');
      tasks.push({ id, text, done: isDone });
    }
  }

  return tasks;
}

// Generate tasks markdown
function generateTasksMarkdown(content, sections) {
  const lines = content.split('\n');
  let output = [];
  let currentSection = null;

  const formatTask = (task, checked) => {
    const checkbox = checked ? '[x]' : '[ ]';
    const flag = task.flagged ? '🚩 ' : '';
    return `- ${checkbox} [#${task.id}] ${flag}${task.text}`;
  };

  for (const line of lines) {
    if (line.startsWith('## 📋 Backlog')) {
      currentSection = 'backlog';
      output.push(line);
      output.push('');
      for (const task of sections.backlog) {
        output.push(formatTask(task, false));
      }
    } else if (line.startsWith('## 🚀 In Progress')) {
      currentSection = 'inProgress';
      output.push(line);
      output.push('');
      for (const task of sections.inProgress) {
        output.push(formatTask(task, false));
      }
    } else if (line.startsWith('## ✅ Done')) {
      currentSection = 'done';
      output.push(line);
      output.push('');
      for (const task of sections.done) {
        output.push(formatTask(task, true));
      }
    } else if (currentSection && (line.startsWith('- [') || line.trim() === '')) {
      // Skip old task lines and empty lines within task sections
    } else {
      // New section or content outside task sections
      if (line.startsWith('##') || line.startsWith('#')) {
        currentSection = null;
      }
      output.push(line);
    }
  }

  return output.join('\n');
}

// GET - Fetch today's data
export async function GET() {
  const today = getTodayDate();
  const dayTrackFile = path.join(TASKS_DIR, `${today}.md`);

  try {
    // Fetch today's tasks
    const dayTrackContent = await fs.readFile(dayTrackFile, 'utf-8');
    const tasks = parseTasks(dayTrackContent);

    // Fetch bot overnight tasks
    const botFile = path.join(NIGHT_CHECK_DIR, 'bot_overnight.md');
    let botTasks = [];
    try {
      const botContent = await fs.readFile(botFile, 'utf-8');
      botTasks = parseSimpleList(botContent, '# 💤 Sleep Tasks');
    } catch (error) {
      // File doesn't exist
    }

    // Fetch tomorrow's plan
    const planFile = path.join(NIGHT_CHECK_DIR, 'plan.md');
    let tomorrowTasks = [];
    try {
      const planContent = await fs.readFile(planFile, 'utf-8');
      tomorrowTasks = parseSimpleList(planContent, '# 📋 Tomorrow\'s Plan');
    } catch (error) {
      // File doesn't exist
    }

    return Response.json({
      tasks,
      botTasks,
      tomorrowTasks
    });
  } catch (error) {
    // Day track file doesn't exist, create it
    const initialContent = `# ${today} Task Tracker

## 📋 Backlog

## 🚀 In Progress

## ✅ Done

## 💤 Sleep Background Tasks
`;
    await fs.writeFile(dayTrackFile, initialContent);

    return Response.json({
      tasks: { backlog: [], inProgress: [], done: [] },
      botTasks: [],
      tomorrowTasks: []
    });
  }
}

// POST - Add a new task
export async function POST(request) {
  const { text, status } = await request.json();
  const today = getTodayDate();
  const dayTrackFile = path.join(TASKS_DIR, `${today}.md`);

  try {
    const content = await fs.readFile(dayTrackFile, 'utf-8');
    const tasks = parseTasks(content);

    const newTask = {
      id: Date.now().toString(),
      text,
      done: false
    };

    tasks[status].push(newTask);
    const newContent = generateTasksMarkdown(content, tasks);

    await fs.writeFile(dayTrackFile, newContent);
    return Response.json({ success: true, task: newTask });
  } catch (error) {
    return Response.json({ success: false, error: 'Failed to add task' }, { status: 500 });
  }
}

// PUT - Update task status, text, position, or flagged
export async function PUT(request) {
  const body = await request.json();
  const { taskId, status, text, newIndex, flagged } = body;
  console.log('PUT Request:', { taskId, status, text, newIndex, flagged });

  const today = getTodayDate();
  const dayTrackFile = path.join(TASKS_DIR, `${today}.md`);
  console.log('Target File:', dayTrackFile);

  try {
    const content = await fs.readFile(dayTrackFile, 'utf-8');
    const tasks = parseTasks(content);
    // console.log('Current Tasks:', JSON.stringify(tasks, null, 2));

    // Find task
    let foundTask = null;
    let sourceSection = null;
    let sourceIndex = -1;

    for (const section of ['backlog', 'inProgress', 'done']) {
      const index = tasks[section].findIndex(t => t.id === taskId);
      if (index !== -1) {
        foundTask = tasks[section][index];
        sourceSection = section;
        sourceIndex = index;
        break;
      }
    }

    if (!foundTask) {
      console.error('Task not found:', taskId);
      return Response.json({ success: false, error: 'Task not found' }, { status: 404 });
    }

    console.log('Found Task:', foundTask.text, 'in', sourceSection, 'at', sourceIndex);

    // Update text if provided
    if (text !== undefined) {
      console.log('Updating text to:', text);
      foundTask.text = text;
    }

    // Update flagged if provided
    if (flagged !== undefined) {
      console.log('Updating flagged to:', flagged);
      foundTask.flagged = flagged;
    }

    // Handle movement if status or newIndex is involved
    // If only text is updated, we might not need to move, but if status is provided we ensure it's in the right place
    if (status || newIndex !== undefined) {
      const targetSection = status || sourceSection;
      console.log('Targeting Section:', targetSection, 'Index:', newIndex);

      // If we are moving to a new section or changing index
      if (sourceSection !== targetSection || (newIndex !== undefined && newIndex !== sourceIndex)) {
        // Remove from source
        tasks[sourceSection].splice(sourceIndex, 1);

        // Insert into target
        // Ensure index is valid
        let cleanNewIndex = newIndex;
        if (cleanNewIndex === undefined) {
          cleanNewIndex = tasks[targetSection].length;
        }
        // Clamp index
        cleanNewIndex = Math.max(0, Math.min(cleanNewIndex, tasks[targetSection].length));

        console.log('Moving to index:', cleanNewIndex);

        tasks[targetSection].splice(cleanNewIndex, 0, foundTask);
      }
    }

    const newContent = generateTasksMarkdown(content, tasks);
    // console.log('New Content Preview:', newContent.substring(0, 200));

    await fs.writeFile(dayTrackFile, newContent);
    console.log('File written successfully');

    return Response.json({ success: true });
  } catch (error) {
    console.error('Update error:', error);
    return Response.json({ success: false, error: 'Failed to update task' }, { status: 500 });
  }
}

// DELETE - Remove a task
export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get('taskId');
  const today = getTodayDate();
  const dayTrackFile = path.join(TASKS_DIR, `${today}.md`);

  try {
    const content = await fs.readFile(dayTrackFile, 'utf-8');
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
      await fs.writeFile(dayTrackFile, newContent);
      return Response.json({ success: true });
    }

    return Response.json({ success: false, error: 'Task not found' }, { status: 404 });
  } catch (error) {
    return Response.json({ success: false, error: 'Failed to delete task' }, { status: 500 });
  }
}
