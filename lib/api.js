export const api = {
    async getTasks(view, date) {
        if (typeof window !== 'undefined' && window.electron) {
            return window.electron.getTasks({ view, date });
        }
        const params = new URLSearchParams();
        if (view) params.append('view', view);
        if (date) params.append('date', date);

        // Convert view to endpoint
        let endpoint = '/api/today';
        if (view === 'weekly') endpoint = '/api/weekly';
        if (view === 'history') endpoint = '/api/history'; // though this is usually for date list

        // If getting history for specific date, usage is fetchHistoryData(date) which calls /api/history?date=...
        // My abstraction here is a bit leaky because typical usage in page.js is dispersed.
        // However, sticking to the main 'getTasks' pattern:
        const res = await fetch(`${endpoint}?${params.toString()}`);
        return res.json();
    },

    async addTask(text, status, view, date) {
        if (typeof window !== 'undefined' && window.electron) {
            return window.electron.addTask({ text, status, view, date });
        }
        let endpoint = '/api/today';
        if (view === 'weekly') endpoint = '/api/weekly';

        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, status, view, date })
        });
        return res.json();
    },

    async updateTask(taskId, updates, view, date) {
        if (typeof window !== 'undefined' && window.electron) {
            return window.electron.updateTask({ taskId, ...updates, view, date });
        }
        let endpoint = '/api/today';
        if (view === 'weekly') endpoint = '/api/weekly';

        const res = await fetch(endpoint, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskId, ...updates, view, date })
        });
        return res.json();
    },

    async deleteTask(taskId, view, date) {
        if (typeof window !== 'undefined' && window.electron) {
            return window.electron.deleteTask({ taskId, view, date });
        }
        let endpoint = '/api/today';
        if (view === 'weekly') endpoint = '/api/weekly';

        const res = await fetch(`${endpoint}?taskId=${taskId}`, { method: 'DELETE' });
        return res.json();
    },

    async getHistory(date) {
        if (typeof window !== 'undefined' && window.electron) {
            return window.electron.getHistory({ date });
        }
        const params = new URLSearchParams();
        if (date) params.append('date', date);
        const res = await fetch(`/api/history?${params.toString()}`);
        return res.json();
    }
};
