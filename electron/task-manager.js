const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');

// We need to determine where to store data.
// The original code used hardcoded paths: '/Users/mia/.openclaw/workspace/tasks/...'
// For an Electron app, we should probably stick to these paths if they are the user's data,
// OR use app.getPath('userData') if we want to be more portable.
// Given the user specifically asked for *this* codebase to be an app, I should probably respect the hardcoded paths 
// OR better yet, make them configurable or relative to home dir.
// The original code used '/Users/mia/...', which suggests it was developer-specific. 
// I will try to use the home directory dynamically.

const HOME_DIR = app.getPath('home');
const BASE_WORKSPACE = path.join(HOME_DIR, '.openclaw', 'workspace', 'tasks');

const TASKS_DIR = path.join(BASE_WORKSPACE, 'daily', 'day_track');
const ARCHIVED_DIR = path.join(BASE_WORKSPACE, 'daily', 'archived');
const NIGHT_CHECK_DIR = path.join(BASE_WORKSPACE, 'daily', 'night_check');
const WEEKLY_PLAN_FILE = path.join(BASE_WORKSPACE, 'weekly', 'plan.md');

// Date Utils (Inlined for CommonJS compatibility)
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function parseDate(dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
}

function getTodayDate() {
    return formatDate(new Date());
}

function isPastDate(dateStr) {
    const date = parseDate(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
}

function isTomorrow(dateStr) {
    const date = parseDate(dateStr);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return date.toDateString() === tomorrow.toDateString();
}

// Logic adapted from app/api/tasks/route.js

async function initTasksFile(date) {
    const filePath = path.join(TASKS_DIR, `${date}.md`);
    try {
        await fs.access(filePath);
    } catch {
        // Ensure directory exists
        await fs.mkdir(TASKS_DIR, { recursive: true });

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
            // Skip old task lines
        } else {
            output.push(line);
        }
    }
    return output.join('\n');
}

function appendToWeeklyPlan(content, text) {
    const id = Date.now().toString();
    const newTask = `- [ ] [#${id}] ${text}`;
    const lines = content.split('\n');
    const insertionIndex = lines.findIndex(line => line.startsWith('##'));
    const insertAt = insertionIndex === -1 ? lines.length : insertionIndex;
    lines.splice(insertAt, 0, newTask);
    return lines.join('\n');
}

function generateWeeklyPlanTemplate(text) {
    const id = Date.now().toString();
    return `# 📅 Weekly Plan\n\n*(This file is automatically generated by Weekly Check)*\n\n- [ ] [#${id}] ${text}\n`;
}

// Handler functions to be called via IPC

async function getTasks({ date, view } = {}) {
    date = date || getTodayDate();
    view = view || 'daily';

    if (view === 'weekly') {
        try {
            const content = await fs.readFile(WEEKLY_PLAN_FILE, 'utf-8');
            const tasks = parseWeeklyPlan(content);
            return { tasks, view: 'weekly' };
        } catch {
            return { tasks: [], view: 'weekly' };
        }
    }

    if (view === 'achieved') {
        return { tasks: [], view: 'achieved' };
    }

    const today = getTodayDate();

    if (date === today) {
        const filePath = await initTasksFile(date);
        const content = await fs.readFile(filePath, 'utf-8');
        const tasks = parseTasks(content);
        return { tasks, view: 'daily', date, source: 'day_track' };
    }

    if (isPastDate(date)) {
        const dayTrackFile = path.join(TASKS_DIR, `${date}.md`);
        try {
            const content = await fs.readFile(dayTrackFile, 'utf-8');
            const tasks = parseTasks(content);
            return { tasks, view: 'daily', date, source: 'day_track' };
        } catch {
            // Try archived
            const archivedFile = path.join(ARCHIVED_DIR, date, 'day_track.md');
            try {
                const content = await fs.readFile(archivedFile, 'utf-8');
                const tasks = parseTasks(content);
                return { tasks, view: 'daily', date, source: 'archived' };
            } catch {
                return { tasks: { backlog: [], inProgress: [], done: [] }, view: 'daily', date, source: 'none', message: 'No task records' };
            }
        }
    }

    if (isTomorrow(date)) {
        const planFile = path.join(NIGHT_CHECK_DIR, 'plan.md');
        try {
            const content = await fs.readFile(planFile, 'utf-8');
            const tasks = parsePlanAsTasks(content);
            return { tasks, view: 'daily', date, source: 'plan_preview' };
        } catch {
            return { tasks: { backlog: [], inProgress: [], done: [] }, view: 'daily', date, source: 'none' };
        }
    }

    return { tasks: { backlog: [], inProgress: [], done: [] }, view: 'daily', date, source: 'none' };
}

async function addTask({ text, status, view, date }) {
    date = date || getTodayDate();
    view = view || 'daily';

    if (view === 'weekly') {
        try {
            // Ensure directory exists for weekly plan
            await fs.mkdir(path.dirname(WEEKLY_PLAN_FILE), { recursive: true });
            let content;
            try {
                content = await fs.readFile(WEEKLY_PLAN_FILE, 'utf-8');
            } catch {
                content = '';
            }

            if (content) {
                const newContent = appendToWeeklyPlan(content, text);
                await fs.writeFile(WEEKLY_PLAN_FILE, newContent);
            } else {
                const newContent = generateWeeklyPlanTemplate(text);
                await fs.writeFile(WEEKLY_PLAN_FILE, newContent);
            }
            return { success: true };
        } catch (err) {
            console.error(err);
            return { success: false, error: err.message };
        }
    }

    const today = getTodayDate();
    if (date !== today) {
        return { success: false, error: 'Can only add tasks for today' };
    }

    const filePath = await initTasksFile(date);
    const content = await fs.readFile(filePath, 'utf-8');
    const tasks = parseTasks(content);

    const newTask = {
        id: Date.now().toString(),
        text,
        done: false
    };

    if (!tasks[status]) tasks[status] = []; // Safety check
    tasks[status].push(newTask);
    const newContent = generateTasksMarkdown(content, tasks);
    await fs.writeFile(filePath, newContent);
    return { success: true, task: newTask };
}

async function updateTask({ taskId, status, text, flagged, view, date }) {
    date = date || getTodayDate();
    view = view || 'daily';

    if (view === 'weekly') {
        try {
            const content = await fs.readFile(WEEKLY_PLAN_FILE, 'utf-8');
            const lines = content.split('\n');
            let updated = false;
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes(`[#${taskId}]`)) {
                    // Check if we are toggling status
                    if (status !== undefined || flagged !== undefined) {
                        // For now weekly only supports toggling done status via checkmark, which might be passed as generic update
                        // The original code toggled based on existence.
                        // We'll stick to simple toggle for weekly if that's what it did, OR improve it.
                        // Original: lines[i] = lines[i].replace(/^- \[([ x])\]/, ...
                        lines[i] = lines[i].replace(/^- \[([ x])\]/, (match, checked) => {
                            return `- [${checked === 'x' ? ' ' : 'x'}]`;
                        });
                        updated = true;
                    }
                    // Handle text update for weekly?
                    if (text) {
                        // Replace text part... regex is tricky without destroying ID
                        // Format: - [ ] [#id] text
                        const parts = lines[i].split(`[#${taskId}] `);
                        if (parts.length === 2) {
                            lines[i] = `${parts[0]}[#${taskId}] ${text}`;
                            updated = true;
                        }
                    }
                    if (updated) break;
                }
            }
            if (updated) {
                await fs.writeFile(WEEKLY_PLAN_FILE, lines.join('\n'));
                return { success: true };
            }
            return { success: false, error: 'Task not found' };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    const today = getTodayDate();
    if (date !== today) {
        return { success: false, error: 'Can only edit tasks for today' };
    }

    const filePath = await initTasksFile(date);
    const content = await fs.readFile(filePath, 'utf-8');
    const tasks = parseTasks(content);

    let foundTask = null;
    let currentSection = null;

    for (const section of ['backlog', 'inProgress', 'done']) {
        const taskIndex = tasks[section].findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
            foundTask = tasks[section][taskIndex];
            currentSection = section;
            // If moving, remove it from here. If just updating, keep it or replace it?
            // If status is provided and different, we move.
            if (status && status !== section) {
                tasks[section].splice(taskIndex, 1);
            }
            break;
        }
    }

    if (foundTask) {
        // Update properties
        if (text !== undefined) foundTask.text = text;
        if (flagged !== undefined) foundTask.flagged = flagged; // Note: Markdown persistence of flag? 
        // The original parser doesn't seem to parse 'flagged'. 
        // So persisting 'flagged' might not work unless we change generic parser/generator.
        // Ignored for now to match Route.js capability (or lack thereof).

        // If moved
        if (status && status !== currentSection) {
            if (!tasks[status]) tasks[status] = [];
            tasks[status].push(foundTask);
        }
        // If not moved, it's already in the object reference in array (unless we spliced it out?)
        // Wait, if I spliced it out above?
        // My logic above: if (status && status !== section) splice.
        // So if status is NOT provided, it wasn't spliced. Modifying foundTask updates it in place.
        // If status IS provided and SAME, it wasn't spliced.
        // So correct.

        const newContent = generateTasksMarkdown(content, tasks);
        await fs.writeFile(filePath, newContent);
        return { success: true };
    }

    return { success: false, error: 'Task not found' };
}

async function deleteTask({ taskId, view, date }) {
    date = date || getTodayDate();
    view = view || 'daily';

    if (view === 'weekly') {
        try {
            const content = await fs.readFile(WEEKLY_PLAN_FILE, 'utf-8');
            const lines = content.filter(line => !line.includes(`[#${taskId}]`));
            await fs.writeFile(WEEKLY_PLAN_FILE, lines.join('\n'));
            return { success: true };
        } catch {
            return { success: false, error: 'Task not found' };
        }
    }

    const today = getTodayDate();
    if (date !== today) {
        return { success: false, error: 'Can only delete tasks for today' };
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
        return { success: true };
    }

    return { success: false, error: 'Task not found' };
}

async function getHistory({ date } = {}) {
    // If date is provided, fetch that date's data
    if (date) {
        const archivePath = path.join(ARCHIVED_DIR, date);

        try {
            // Fetch day_track
            const dayTrackFile = path.join(archivePath, 'day_track.md');
            const dayTrackContent = await fs.readFile(dayTrackFile, 'utf-8');
            const tasks = parseTasks(dayTrackContent);

            return {
                date,
                tasks
            };
        } catch (error) {
            return { error: 'Date not found' };
        }
    }

    // Fetch all archived dates
    try {
        const entries = await fs.readdir(ARCHIVED_DIR, { withFileTypes: true });
        const dates = entries
            .filter(entry => entry.isDirectory())
            .map(entry => entry.name)
            .sort((a, b) => b.localeCompare(a)); // Most recent first

        return { dates };
    } catch (error) {
        return { dates: [] };
    }
}

module.exports = {
    getTasks,
    addTask,
    updateTask,
    deleteTask,
    getHistory
};
