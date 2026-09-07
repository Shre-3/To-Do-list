const STORAGE_KEY = 'tech_todo_progress_v1';
const LOCAL_UPDATED_KEY = STORAGE_KEY + '_updated_at';

// Supabase config - provided by env.js at deploy/build time
const SUPABASE_URL = window.SUPABASE_URL || null;
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || null;
const SERVER_ID = window.SERVER_ID || 'default';

let supabase = null;

const topics = [
  { id: 'dsa', title: 'DSA', items: ['Arrays/strings','Two pointers/sliding window','Hash maps/sets','Stacks/queues','Binary search','Linked lists','Recursion/DP','Trees with BFS/DFS'] },
  { id: 'sql', title: 'SQL', items: ['Joins','Window functions','Group by/HAVING','Subqueries','CTEs'] },
  { id: 'python', title: 'Python for data work', items: ['pandas (groupby, merge, pivot, null handling)','sklearn (train/test, fit/predict, metrics)','numpy'] },
  { id: 'stats', title: 'Statistics / Probability', items: ['Distributions','p-values','Confidence intervals','Bias-variance tradeoff','Overfitting','Sampling'] },
  { id: 'ml', title: 'ML fundamentals — explanatory depth', items: ['Mechanism','Why this model vs alternatives','Failure modes'] },
  { id: 'project', title: 'Own-project defense', items: ['Architecture decisions","What you\'d change','What broke','How to scale'] },
  { id: 'ab', title: 'A/B testing / experiment design', items: ['Significance','Sample size','Metric selection','Common pitfalls'] }
];

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  const now = new Date().toISOString();
  localStorage.setItem(LOCAL_UPDATED_KEY, now);

  // Save to Supabase if configured
  if (supabase) {
    supabase.from('progress').upsert({ user_id: SERVER_ID, data: state, updated_at: now }).catch(() => {});
  }
}

function render() {
  const state = loadState();
  const topicsDiv = document.getElementById('topics');
  topicsDiv.innerHTML = '';
  let total = 0, done = 0;
  topics.forEach(t => {
    const section = document.createElement('section');
    section.className = 'topic';
    const h = document.createElement('h2'); h.textContent = t.title; section.appendChild(h);
    const list = document.createElement('ul');
    t.items.forEach((it, idx) => {
      total += 1;
      const key = `${t.id}::${idx}`;
      const checked = !!(state[key]); if (checked) done += 1;
      const li = document.createElement('li');
      const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = checked; cb.dataset.key = key; cb.addEventListener('change', onToggle);
      const span = document.createElement('span'); span.textContent = it;
      li.appendChild(cb); li.appendChild(span); list.appendChild(li);
    });
    section.appendChild(list); topicsDiv.appendChild(section);
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
  localStorage.removeItem(LOCAL_UPDATED_KEY);
  if (supabase) supabase.from('progress').delete().eq('user_id', SERVER_ID).catch(() => {});
  render();
}

function exportProgress() {
  const state = loadState();
  const blob = new Blob([JSON.stringify(state, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'tech_todo_progress.json'; a.click(); URL.revokeObjectURL(url);
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('reset').addEventListener('click', resetProgress);
  document.getElementById('export').addEventListener('click', exportProgress);

  // Init Supabase client if keys are present
  if (SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase) {
    try { supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY); } catch (e) { supabase = null; }
  }

  (async () => {
    if (supabase) {
      try {
        const { data: row, error } = await supabase.from('progress').select('data, updated_at').eq('user_id', SERVER_ID).single();
        if (!error && row && row.data) {
          try {
            const serverState = row.data || {};
            const serverUpdated = row.updated_at ? new Date(row.updated_at) : null;
            const localUpdatedRaw = localStorage.getItem(LOCAL_UPDATED_KEY);
            const localUpdated = localUpdatedRaw ? new Date(localUpdatedRaw) : null;
            const serverHasData = serverState && Object.keys(serverState).length > 0;
            if (serverHasData && (!localUpdated || (serverUpdated && serverUpdated > localUpdated))) {
              saveState(serverState);
            }
          } catch (e) {}
        }
      } catch (e) {}
    }

    render();
  })();
});
