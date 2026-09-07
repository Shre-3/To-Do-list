const STORAGE_KEY = 'tech_todo_progress_v1';
const SERVER_URL = (window.SERVER_URL || 'http://localhost:3000').replace(/\/$/, '');
const SERVER_ID = (window.SERVER_ID || 'default');
// Supabase settings (provide by setting window.SUPABASE_URL and window.SUPABASE_ANON_KEY in index.html)
const SUPABASE_URL = window.SUPABASE_URL || null;
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || null;
let supabase = null;
let supabaseUser = null;

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

  // If Supabase is configured and user is signed in, upsert the state into Supabase
  if (supabase && supabaseUser) {
    try {
      supabase.from('progress').upsert({ user_id: supabaseUser.id, data: state, updated_at: new Date().toISOString() }).then(() => {});
    } catch (e) {
      // ignore
    }
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
  // Initialize Supabase client if configured
  if (SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase) {
    try {
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      // auth UI handlers
      const signInBtn = document.getElementById('signIn');
      const signOutBtn = document.getElementById('signOut');
      const authEmail = document.getElementById('authEmail');
      const userInfo = document.getElementById('userInfo');

      signInBtn.addEventListener('click', async () => {
        const email = authEmail.value.trim();
        if (!email) return alert('Enter your email');
        await supabase.auth.signInWithOtp({ email });
        alert('Check your email for a sign-in link (magic link)');
      });

      signOutBtn.addEventListener('click', async () => {
        await supabase.auth.signOut();
        supabaseUser = null;
        userInfo.textContent = '';
        signOutBtn.style.display = 'none';
        signInBtn.style.display = '';
      });

      supabase.auth.onAuthStateChange(async (event, session) => {
        const { data } = await supabase.auth.getUser();
        supabaseUser = data.user || null;
        if (supabaseUser) {
          userInfo.textContent = supabaseUser.email || supabaseUser.id;
          signOutBtn.style.display = '';
          signInBtn.style.display = 'none';
          // load server copy for this user
          try {
            const { data: row, error } = await supabase.from('progress').select('data').eq('user_id', supabaseUser.id).single();
            if (!error && row && row.data) {
              saveState(row.data);
              render();
            }
          } catch (e) {}
        } else {
          userInfo.textContent = '';
          signOutBtn.style.display = 'none';
          signInBtn.style.display = '';
        }
      });
    } catch (e) {
      // ignore
    }
  }
  // On load, attempt to retrieve server copy and use it (best-effort)
  (async () => {
    // Try Supabase session first (if configured)
    if (supabase) {
      try {
        const { data } = await supabase.auth.getUser();
        supabaseUser = data.user || null;
        if (supabaseUser) {
          const { data: row, error } = await supabase.from('progress').select('data').eq('user_id', supabaseUser.id).single();
          if (!error && row && row.data) saveState(row.data);
        }
      } catch (e) {}
    }

    // Fallback to existing server load
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
