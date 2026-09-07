const STORAGE_KEY = 'tech_todo_progress_v1';
const SERVER_URL = (window.SERVER_URL || 'http://localhost:3000').replace(/\/$/, '');
const SERVER_ID = (window.SERVER_ID || 'default');

const topics = [
  {
    id: 'dsa',
    title: 'DSA',
    items: [
      'Arrays/strings',
      'Two pointers/sliding window',
      'Hash maps/sets',
      'Stacks/queues',
      'Binary search',
      'Linked lists',
      'Recursion/DP',
      'Trees with BFS/DFS'
    ]
  },
  {
    id: 'sql',
    title: 'SQL',
    items: ['Joins', 'Window functions', 'Group by/HAVING', 'Subqueries', 'CTEs']
  },
  {
    id: 'python',
    title: 'Python for data work',
    items: ['pandas (groupby, merge, pivot, null handling)', 'sklearn (train/test, fit/predict, metrics)', 'numpy']
  },
  {
    id: 'stats',
    title: 'Statistics / Probability',
    items: ['Distributions', 'p-values', 'Confidence intervals', 'Bias-variance tradeoff', 'Overfitting', 'Sampling']
  },
  {
    id: 'ml',
    title: 'ML fundamentals — explanatory depth',
    items: ['Mechanism', 'Why this model vs alternatives', 'Failure modes']
  },
  {
    id: 'project',
    title: 'Own-project defense',
    items: ['Architecture decisions', "What you'd change", 'What broke', 'How to scale']
  },
  {
    id: 'ab',
    title: 'A/B testing / experiment design',
    items: ['Significance', 'Sample size', 'Metric selection', 'Common pitfalls']
  }
];

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  // best-effort save to server SQLite DB
  try {
    fetch(`${SERVER_URL}/save/${encodeURIComponent(SERVER_ID)}`, {
      method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({state})
    }).catch(() => {});
  } catch (e) {}
}

function render() {
  const state = loadState();
  const topicsDiv = document.getElementById('topics');
  topicsDiv.innerHTML = '';

  let total = 0, done = 0;

  topics.forEach(t => {
    const section = document.createElement('section');
    section.className = 'topic';

    const h = document.createElement('h2');
    h.textContent = t.title;
    section.appendChild(h);

    const list = document.createElement('ul');
    t.items.forEach((it, idx) => {
      total += 1;
      const key = `${t.id}::${idx}`;
      const checked = !!(state[key]);
      if (checked) done += 1;

      const li = document.createElement('li');
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = checked;
      cb.dataset.key = key;
      cb.addEventListener('change', onToggle);

      const span = document.createElement('span');
      span.textContent = it;

      li.appendChild(cb);
      li.appendChild(span);
      list.appendChild(li);
    });

    section.appendChild(list);
    topicsDiv.appendChild(section);
  });

  const overall = Math.round((done / Math.max(1, total)) * 100);
  document.getElementById('overall').textContent = overall + '%';
}

function onToggle(e) {
  const key = e.target.dataset.key;
  const state = loadState();
  state[key] = e.target.checked;
  saveState(state);
  render();
}

function resetProgress() {
  if (!confirm('Reset all progress?')) return;
  localStorage.removeItem(STORAGE_KEY);
  render();
}

function exportProgress() {
  const state = loadState();
  const blob = new Blob([JSON.stringify(state, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'tech_todo_progress.json';
  a.click();
  URL.revokeObjectURL(url);
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('reset').addEventListener('click', resetProgress);
  document.getElementById('export').addEventListener('click', exportProgress);
  // On load, attempt to retrieve server copy and use it (best-effort)
  (async () => {
    try {
      const res = await fetch(`${SERVER_URL}/load/${encodeURIComponent(SERVER_ID)}`);
      if (res.ok) {
        const j = await res.json();
        if (j && j.ok) {
          saveState(j.state || {});
        }
      }
    } catch (e) {
      // ignore network errors
    }
    render();
  })();
});
