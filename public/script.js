let activeNotes = [];
const notifiedIds = new Set();

// Load initial notes from backend
async function loadNotes() {
  const res = await fetch('/api/notes');
  activeNotes = await res.json();
  renderNotes();
}

function formatDateDisplay(isoString) {
  if (!isoString) return null;
  const target = new Date(isoString);
  const now = new Date();
  const diffMs = target - now;

  const dateOptions = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  const formatted = target.toLocaleString(undefined, dateOptions);

  if (diffMs < 0) {
    return { text: `⚠️ Overdue (${formatted})`, className: 'overdue' };
  } else if (diffMs <= 15 * 60 * 1000) {
    return { text: `⏰ Due soon (${formatted})`, className: 'due-soon' };
  }
  return { text: `📅 ${formatted}`, className: '' };
}

function renderNotes() {
  const list = document.getElementById('notesList');
  if (activeNotes.length === 0) {
    list.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 2rem;">No pending notes or tasks.</div>`;
    return;
  }

  list.innerHTML = activeNotes.map(n => {
    const dateMeta = formatDateDisplay(n.dueDate);
    return `
      <div class="note-card">
        <div class="note-content">
          <span class="note-text">${escapeHtml(n.text)}</span>
          ${dateMeta ? `<span class="badge-date ${dateMeta.className}">${dateMeta.text}</span>` : ''}
        </div>
        <button class="btn-delete" title="Delete note" onclick="deleteNote(${n.id})">✕</button>
      </div>
    `;
  }).join('');
}

async function addNote() {
  const input = document.getElementById('noteInput');
  const dateInput = document.getElementById('dateInput');
  const text = input.value.trim();
  const dueDate = dateInput.value;

  if (!text) return;

  const res = await fetch('/api/notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, dueDate })
  });

  if (res.ok) {
    input.value = '';
    dateInput.value = '';
    await loadNotes();
  }
}

async function deleteNote(id) {
  await fetch(`/api/notes/${id}`, { method: 'DELETE' });
  notifiedIds.delete(id);
  await loadNotes();
}

// Reminder check system (Runs every 10 seconds)
setInterval(() => {
  const now = new Date();
  activeNotes.forEach(note => {
    if (note.dueDate && !notifiedIds.has(note.id)) {
      const noteTime = new Date(note.dueDate);
      // Trigger when within 1 minute of deadline or past it
      if (noteTime <= now) {
        triggerReminder(note);
        notifiedIds.add(note.id);
      }
    }
  });
  renderNotes(); // Refresh badges (e.g., mark as overdue)
}, 10000);

function triggerReminder(note) {
  playAlertTone();
  showToast(`🔔 Reminder: ${note.text}`);

  // Browser desktop notification fallback if granted
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("Task Reminder", { body: note.text });
  }
}

// Web Audio API beep sound
function playAlertTone() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) {
    // Audio contexts require user interaction before autoplay
  }
}

function showToast(message) {
  const toast = document.getElementById('toastAlert');
  toast.innerText = message;
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; }, 6000);
}

function escapeHtml(str) {
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[tag] || tag));
}

// Request desktop notification permission on first launch
if ("Notification" in window && Notification.permission === "default") {
  Notification.requestPermission();
}

loadNotes();