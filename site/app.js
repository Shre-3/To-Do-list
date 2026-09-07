const SUPABASE_URL = window.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || '';
const hasSupabaseConfig = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase);
const supabaseClient = hasSupabaseConfig
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const topics = [
  { id: 'dsa', title: 'DSA', items: ['Arrays/strings', 'Two pointers/sliding window', 'Hash maps/sets', 'Stacks/queues', 'Binary search', 'Linked lists', 'Recursion/DP', 'Trees with BFS/DFS'] },
  { id: 'sql', title: 'SQL', items: ['Joins', 'Window functions', 'Group by/HAVING', 'Subqueries', 'CTEs'] },
  { id: 'python', title: 'Python for data work', items: ['pandas (groupby, merge, pivot, null handling)', 'sklearn (train/test, fit/predict, metrics)', 'numpy'] },
  { id: 'stats', title: 'Statistics / Probability', items: ['Distributions', 'p-values', 'Confidence intervals', 'Bias-variance tradeoff', 'Overfitting', 'Sampling'] },
  { id: 'ml', title: 'ML fundamentals - explanatory depth', items: ['Mechanism', 'Why this model vs alternatives', 'Failure modes'] },
  { id: 'project', title: 'Own-project defense', items: ['Architecture decisions', "What you'd change", 'What broke', 'How to scale'] },
  { id: 'ab', title: 'A/B testing / experiment design', items: ['Significance', 'Sample size', 'Metric selection', 'Common pitfalls'] }
];

let state = {};
let currentUser = null;
let saveQueue = Promise.resolve();

function setStatus(message) {
  document.getElementById('status').textContent = message;
}

function render() {
  const topicsDiv = document.getElementById('topics');
  topicsDiv.innerHTML = '';
  let total = 0;
  let done = 0;

  topics.forEach(topic => {
    const section = document.createElement('section');
    section.className = 'topic';
    const heading = document.createElement('h2');
    heading.textContent = topic.title;
    section.appendChild(heading);

    const list = document.createElement('ul');
    topic.items.forEach((item, index) => {
      total += 1;
      const key = `${topic.id}::${index}`;
      const checked = state[key] === true;
      if (checked) done += 1;

      const row = document.createElement('li');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = checked;
      checkbox.disabled = !currentUser;
      checkbox.dataset.key = key;
      checkbox.addEventListener('change', onToggle);
      const label = document.createElement('span');
      label.textContent = item;
      row.append(checkbox, label);
      list.appendChild(row);
    });
    section.appendChild(list);
    topicsDiv.appendChild(section);
  });

  document.getElementById('overall').textContent = `${Math.round((done / Math.max(1, total)) * 100)}%`;
  document.getElementById('reset').disabled = !currentUser;
}

async function loadState() {
  if (!currentUser) {
    state = {};
    setStatus('Sign in to load and save your progress.');
    render();
    return;
  }

  setStatus('Loading saved progress...');
  const { data, error } = await supabaseClient
    .from('progress')
    .select('data')
    .eq('user_id', currentUser.id)
    .maybeSingle();
  if (error) throw error;
  state = data?.data || {};
  setStatus('Progress synced with Supabase.');
  render();
}

function saveState(nextState) {
  if (!currentUser) return Promise.reject(new Error('Sign in required'));
  state = nextState;
  render();
  setStatus('Saving...');
  saveQueue = saveQueue
    .catch(() => {})
    .then(async () => {
      const { error } = await supabaseClient.from('progress').upsert({
        user_id: currentUser.id,
        data: state,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
      if (error) throw error;
      setStatus('Saved to Supabase.');
    });
  return saveQueue;
}

function onToggle(event) {
  saveState({ ...state, [event.target.dataset.key]: event.target.checked }).catch(error => {
    console.error(error);
    setStatus(`Unable to save progress: ${error.message || 'Supabase rejected the write.'}`);
  });
}

function resetProgress() {
  if (!currentUser || !confirm('Reset all progress?')) return;
  saveState({}).catch(error => {
    console.error(error);
    setStatus(`Unable to save progress: ${error.message || 'Supabase rejected the write.'}`);
  });
}

function exportProgress() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'tech_todo_progress.json';
  link.click();
  URL.revokeObjectURL(url);
}

async function updateUser(session) {
  currentUser = session?.user || null;
  const signIn = document.getElementById('signIn');
  const signOut = document.getElementById('signOut');
  const authEmail = document.getElementById('authEmail');
  document.getElementById('userInfo').textContent = currentUser?.email || '';
  signIn.style.display = currentUser ? 'none' : '';
  signOut.style.display = currentUser ? '' : 'none';
  authEmail.style.display = currentUser ? 'none' : '';
  await loadState();
}

document.addEventListener('DOMContentLoaded', async () => {
  if (!hasSupabaseConfig) {
    setStatus('Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY, rebuild, and reload.');
    render();
    return;
  }

  document.getElementById('reset').addEventListener('click', resetProgress);
  document.getElementById('export').addEventListener('click', exportProgress);
  document.getElementById('signIn').addEventListener('click', async () => {
    const email = document.getElementById('authEmail').value.trim();
    if (!email) return setStatus('Enter your email address.');
    const { error } = await supabaseClient.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin }
    });
    setStatus(error ? error.message : 'Check your email for the sign-in link.');
  });
  document.getElementById('signOut').addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
  });

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    updateUser(session).catch(error => {
      console.error(error);
      setStatus('Unable to load saved progress.');
    });
  });

  const { data, error } = await supabaseClient.auth.getSession();
  if (error) setStatus(error.message);
  await updateUser(data.session);
});
