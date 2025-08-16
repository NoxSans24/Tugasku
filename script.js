const addBtn = document.getElementById('addBtn');
const taskInput = document.getElementById('taskInput');
const taskList = document.getElementById('taskList');
const themeToggle = document.querySelector('.theme-toggle');
const searchInput = document.getElementById('searchInput');
const filterSelect = document.getElementById('filterSelect');
const categoryFilter = document.getElementById('categoryFilter');
const sortSelect = document.getElementById('sortSelect');
const categorySelect = document.getElementById('categorySelect');
const deadlineInput = document.getElementById('deadlineInput');
const totalTasksEl = document.getElementById('totalTasks');
const completedTasksEl = document.getElementById('completedTasks');
const pendingTasksEl = document.getElementById('pendingTasks');
const progressBar = document.getElementById('progressBar');

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];

if ("Notification" in window && Notification.permission !== "granted") {
  Notification.requestPermission();
}
function showNotification(title, body) {
  if (Notification.permission === "granted") {
    new Notification(title, { body: body, icon: "logo.png" });
  }
}

function checkDeadlines() {
  const today = new Date();
  const todayStr = today.toDateString();

  tasks.forEach(task => {
    if (!task.deadline || task.completed) return;

    const d = new Date(task.deadline);
    const diffDays = Math.ceil((d - today) / (1000 * 60 * 60 * 24));

    if (task.lastNotified === todayStr) return;

    if (diffDays === 0) {
      showNotification("⏰ Deadline Hari Ini", `Tugas "${task.text}" harus selesai hari ini!`);
      task.lastNotified = todayStr;
    } else if (diffDays === 1) {
      showNotification("📅 Deadline Besok", `Tugas "${task.text}" jatuh tempo besok.`);
      task.lastNotified = todayStr;
    }
  });

  localStorage.setItem('tasks', JSON.stringify(tasks));
}

setInterval(checkDeadlines, 60 * 1000);

function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 5000);
}

// 🔹 Render tugas
function renderTasks() {
  taskList.innerHTML = '';

  let filtered = tasks.filter(t => {
    if (filterSelect.value === 'completed') return t.completed;
    if (filterSelect.value === 'pending') return !t.completed;
    return true;
  });

  if (categoryFilter.value !== 'all') {
    filtered = filtered.filter(t => t.category === categoryFilter.value);
  }

  const q = searchInput.value.trim().toLowerCase();
  if (q) {
    filtered = filtered.filter(t => t.text.toLowerCase().includes(q));
  }

  const key = sortSelect.value;
  if (key === 'deadline') {
    filtered.sort((a, b) => {
      const da = a.deadline ? new Date(a.deadline).getTime() : Infinity;
      const db = b.deadline ? new Date(b.deadline).getTime() : Infinity;
      return da - db;
    });
  } else if (key === 'alpha') {
    filtered.sort((a, b) => a.text.localeCompare(b.text, 'id'));
  } else if (key === 'status') {
    filtered.sort((a, b) => Number(a.completed) - Number(b.completed));
  }

  const today = new Date();

  filtered.forEach(task => {
    const li = document.createElement('li');
    const isOverdue = task.deadline && !task.completed && new Date(task.deadline) < new Date(today.toDateString());
    if (isOverdue) li.classList.add('overdue');
    if (task.completed) li.classList.add('completed');

    const left = document.createElement('div');
    left.className = 'task-main';

    const titleRow = document.createElement('div');
    titleRow.className = 'task-title';

    const badge = document.createElement('span');
    badge.className = `badge ${task.category}`;
    badge.textContent = task.category;

    const titleSpan = document.createElement('span');
    titleSpan.textContent = task.text;

    titleRow.appendChild(badge);
    titleRow.appendChild(titleSpan);

    const info = document.createElement('div');
    info.className = 'deadline';
    if (task.deadline) {
      const d = new Date(task.deadline);
      const dStr = d.toLocaleDateString('id-ID');
      let extra = '';
      const diffDays = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
      if (!task.completed) {
        if (diffDays < 0) extra = ' • Terlewat';
        else if (diffDays === 0) extra = ' • Hari ini';
        else extra = ` • ${diffDays} hari lagi`;
      }
      info.textContent = `Deadline: ${dStr}${extra}`;
    } else {
      info.textContent = 'Tanpa deadline';
    }

    left.appendChild(titleRow);
    left.appendChild(info);

    const actions = document.createElement('div');
    actions.className = 'actions';
    actions.innerHTML = `
      <button class="toggleBtn" title="Tandai Selesai"><i class="fas fa-check"></i></button>
      <button class="editBtn" title="Edit Tugas"><i class="fas fa-pen"></i></button>
      <button class="delBtn" title="Hapus Tugas"><i class="fas fa-trash-alt"></i></button>
    `;

    // Events
    actions.querySelector('.toggleBtn').addEventListener('click', () => {
      const idx = tasks.findIndex(t => t.id === task.id);
      tasks[idx].completed = !tasks[idx].completed;
      saveAndRender();
      showToast(tasks[idx].completed ? "✅ Tugas selesai!" : "↩️ Tugas dikembalikan!", "success");
    });

    // ✅ Animasi fadeOut saat hapus
    actions.querySelector('.delBtn').addEventListener('click', () => {
      li.classList.add('removing');
      setTimeout(() => {
        tasks = tasks.filter(t => t.id !== task.id);
        saveAndRender();
        showToast("🗑️ Tugas dihapus!", "danger");
      }, 400); // durasi sesuai animasi CSS
    });

    actions.querySelector('.editBtn').addEventListener('click', () => {
      if (li.classList.contains('editing')) return;
      li.classList.add('editing');

      const input = document.createElement('input');
      input.type = 'text';
      input.value = task.text;
      input.setAttribute('aria-label', 'Edit tugas');
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') saveEdit();
        if (e.key === 'Escape') cancelEdit();
      });

      titleRow.replaceChild(input, titleSpan);
      input.focus();
      input.select();

      const saveBtn = document.createElement('button');
      saveBtn.innerHTML = '<i class="fas fa-save"></i>';
      const cancelBtn = document.createElement('button');
      cancelBtn.innerHTML = '<i class="fas fa-times"></i>';

      actions.prepend(saveBtn);
      actions.prepend(cancelBtn);

      function saveEdit() {
        const newText = input.value.trim();
        if (newText) {
          const idx = tasks.findIndex(t => t.id === task.id);
          tasks[idx].text = newText;
          saveAndRender();
          showToast("✏️ Tugas berhasil diubah!", "success");
        } else {
          cancelEdit();
        }
      }
      function cancelEdit() {
        li.classList.remove('editing');
        titleRow.replaceChild(titleSpan, input);
        saveBtn.remove();
        cancelBtn.remove();
      }

      saveBtn.addEventListener('click', saveEdit);
      cancelBtn.addEventListener('click', cancelEdit);
    });

    li.appendChild(left);
    li.appendChild(actions);
    taskList.appendChild(li);
  });

  updateStats();
}

// 🔹 Update statistik
function updateStats() {
  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const pending = total - completed;

  totalTasksEl.textContent = total;
  completedTasksEl.textContent = completed;
  pendingTasksEl.textContent = pending;

  const progress = total > 0 ? (completed / total) * 100 : 0;
  progressBar.style.width = progress + '%';

  // Ganti warna progress bar sesuai progress
  if (progress >= 70) {
    progressBar.style.background = "linear-gradient(90deg, #06d6a0, #00bfff)";
  } else {
    progressBar.style.background = "linear-gradient(90deg, #ff0f5b, #ff7300)";
  }
}

function saveAndRender() {
  localStorage.setItem('tasks', JSON.stringify(tasks));
  renderTasks();
}

// Tambah tugas
addBtn.addEventListener('click', () => {
  const text = taskInput.value.trim();
  const category = categorySelect.value;
  const deadline = deadlineInput.value;
  if (!text) {
    showToast("⚠️ Tugas tidak boleh kosong!", "warning");
    return;
  }

  tasks.push({
    id: uid(),
    text,
    completed: false,
    category,
    deadline: deadline || null
  });

  taskInput.value = '';
  deadlineInput.value = '';
  saveAndRender();
  showToast("✅ Tugas berhasil ditambahkan!", "success");
});

// Enter = tambah tugas
taskInput.addEventListener('keypress', (e) => {
  if (e.key === "Enter") addBtn.click();
});

// 🔹 Ganti tema dengan transisi smooth
themeToggle.addEventListener('click', () => {
  document.body.classList.add('theme-transition');
  document.body.classList.toggle('light');

  setTimeout(() => {
    document.body.classList.remove('theme-transition');
  }, 300); // sesuai CSS
});

// Event filter, search, sort
searchInput.addEventListener('input', renderTasks);
filterSelect.addEventListener('change', renderTasks);
categoryFilter.addEventListener('change', renderTasks);
sortSelect.addEventListener('change', renderTasks);

// Render pertama kali + migrasi data lama
(function migrateOld() {
  let migrated = false;
  tasks = tasks.map(t => {
    if (!t.id) { migrated = true; return { id: uid(), text: t.text, completed: !!t.completed, category: 'Pribadi', deadline: null }; }
    if (!t.category) { migrated = true; t.category = 'Pribadi'; }
    if (typeof t.deadline === 'undefined') { migrated = true; t.deadline = null; }
    return t;
  });
  if (migrated) localStorage.setItem('tasks', JSON.stringify(tasks));
  renderTasks();
})();

// 🔹 Keyboard Shortcuts
document.addEventListener("keydown", (e) => {
  // Ctrl+F -> fokus ke search
  if (e.ctrlKey && e.key.toLowerCase() === "f") {
    e.preventDefault();
    searchInput.focus();
  }

  // Esc -> batal edit atau clear search
  if (e.key === "Escape") {
    if (document.activeElement === searchInput) {
      searchInput.value = "";
      renderTasks();
    }
    const editing = document.querySelector("li.editing");
    if (editing) {
      editing.classList.remove("editing");
      renderTasks();
    }
  }
});

// Enter di input tugas = tambah tugas
taskInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    addBtn.click();
  }
});
