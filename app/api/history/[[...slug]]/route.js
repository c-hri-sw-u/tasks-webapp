import { promises as fs } from 'fs';
import path from 'path';

const ARCHIVED_DIR = '/Users/mia/.openclaw/workspace/tasks/daily/archived';

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
      const text = line.replace(/^- \[[ x]\] \[#([a-zA-Z0-9_-]+)\] /, '').trim();
      const isDone = line.includes('- [x]');
      sections[currentSection].push({ id, text, done: isDone });
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

    if (inSection && line.startsWith('- [') && !line.includes('*(此文件由')) {
      const idMatch = line.match(/\[#([a-zA-Z0-9_-]+)\]/);
      const id = idMatch ? idMatch[1] : Date.now().toString();
      const text = line.replace(/^- \[[ x]\] \[#([a-zA-Z0-9_-]+)\] /, '').trim();
      const isDone = line.includes('- [x]');
      tasks.push({ id, text, done: isDone });
    }
  }

  return tasks;
}

// GET - Fetch all archived dates
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');

  // If date is provided, fetch that date's data
  if (date) {
    const archivePath = path.join(ARCHIVED_DIR, date);

    try {
      // Fetch day_track
      const dayTrackFile = path.join(archivePath, 'day_track.md');
      const dayTrackContent = await fs.readFile(dayTrackFile, 'utf-8');
      const tasks = parseTasks(dayTrackContent);

      // Fetch bot_overnight
      let botTasks = [];
      const botFile = path.join(archivePath, 'bot_overnight.md');
      try {
        const botContent = await fs.readFile(botFile, 'utf-8');
        botTasks = parseSimpleList(botContent, '# 💤 Sleep Tasks');
      } catch (error) {
        // File doesn't exist
      }

      // Fetch plan
      let planTasks = [];
      const planFile = path.join(archivePath, 'plan.md');
      try {
        const planContent = await fs.readFile(planFile, 'utf-8');
        planTasks = parseSimpleList(planContent, '# 📋 Tomorrow\'s Plan');
      } catch (error) {
        // File doesn't exist
      }

      return Response.json({
        date,
        tasks,
        botTasks,
        plan: planTasks
      });
    } catch (error) {
      return Response.json({ error: 'Date not found' }, { status: 404 });
    }
  }

  // Fetch all archived dates
  try {
    const entries = await fs.readdir(ARCHIVED_DIR, { withFileTypes: true });
    const dates = entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
      .sort((a, b) => b.localeCompare(a)); // Most recent first

    return Response.json({ dates });
  } catch (error) {
    return Response.json({ dates: [] });
  }
}
