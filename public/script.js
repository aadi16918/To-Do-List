const taskListIds = { todo: "todoList", progress: "progressList", completed: "completedList" };
const modal = document.getElementById("modalBackdrop");
const taskForm = document.getElementById("taskForm");
const titleInput = document.getElementById("taskTitle");
const statusInput = document.getElementById("taskStatus");
const priorityInput = document.getElementById("taskPriority");
const formMessage = document.getElementById("formMessage");
const searchInput = document.getElementById("searchInput");
let tasks = [];
let editingId = null;

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers }
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
}
function message(text) { formMessage.textContent = text || ""; }
function openModal(task = null, presetStatus = "todo") {
  editingId = task ? task.id : null;
  document.getElementById("modalTitle").textContent = task ? "Edit task" : "Create a task";
  titleInput.value = task ? task.title : "";
  statusInput.value = task ? task.status : presetStatus;
  priorityInput.value = task ? task.priority : "Medium";
  message("");
  modal.hidden = false;
  setTimeout(() => titleInput.focus(), 0);
}
function closeModal() { modal.hidden = true; taskForm.reset(); editingId = null; message(""); }

document.getElementById("openAdd").addEventListener("click", () => openModal());
document.getElementById("closeModal").addEventListener("click", closeModal);
modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && !modal.hidden) closeModal(); });
document.querySelectorAll(".plus-btn").forEach(btn => btn.addEventListener("click", () => openModal(null, btn.dataset.status)));
document.getElementById("refreshBtn").addEventListener("click", loadTasks);
searchInput.addEventListener("input", renderTasks);

taskForm.addEventListener("submit", async e => {
  e.preventDefault();
  const title = titleInput.value.trim();
  if (!title) { message("Please enter a task name."); titleInput.focus(); return; }
  const payload = { title, status: statusInput.value, priority: priorityInput.value };
  const saveButton = taskForm.querySelector('button[type="submit"]');
  saveButton.disabled = true;
  try {
    if (editingId !== null) {
      await api(`/api/tasks/${editingId}`, { method: "PUT", body: JSON.stringify(payload) });
    } else {
      await api("/api/tasks", { method: "POST", body: JSON.stringify(payload) });
    }
    closeModal();
    await loadTasks();
  } catch (err) {
    message(err.message);
  } finally {
    saveButton.disabled = false;
  }
});

async function loadTasks() {
  try {
    tasks = await api("/api/tasks");
    renderTasks();
  } catch (err) {
    console.error(err);
    alert("Could not load tasks. Check that the Node.js server is running.");
  }
}
function renderTasks() {
  const query = searchInput.value.trim().toLowerCase();
  const visible = tasks.filter(t => t.title.toLowerCase().includes(query));
  const counts = {
    total: tasks.length,
    progress: tasks.filter(t => t.status === "progress").length,
    completed: tasks.filter(t => t.status === "completed").length,
    todo: tasks.filter(t => t.status === "todo").length
  };
  document.getElementById("totalCount").textContent = counts.total;
  document.getElementById("progressCount").textContent = counts.progress;
  document.getElementById("completedCount").textContent = counts.completed;
  document.getElementById("rateCount").textContent = counts.total ? Math.round(counts.completed / counts.total * 100) + "%" : "0%";
  document.getElementById("todoCount").textContent = counts.todo;
  document.getElementById("progressColumnCount").textContent = counts.progress;
  document.getElementById("doneCount").textContent = counts.completed;

  Object.entries(taskListIds).forEach(([status, id]) => {
    const stack = document.getElementById(id);
    stack.replaceChildren();
    const group = visible.filter(t => t.status === status);
    if (!group.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = query ? "No matching tasks." : "Nothing here yet. Add a task to get started.";
      stack.appendChild(empty);
      return;
    }
    group.forEach(task => stack.appendChild(makeCard(task)));
  });
}
function makeCard(task) {
  const card = document.createElement("article");
  card.className = "task-card";
  const top = document.createElement("div");
  top.className = "task-card-top";
  const priority = document.createElement("span");
  priority.className = `priority ${task.priority}`;
  priority.textContent = `${task.priority} priority`;
  const menu = document.createElement("span");
  menu.className = "card-menu";
  menu.textContent = "•••";
  top.append(priority, menu);

  const title = document.createElement("h3");
  title.textContent = task.title;
  const desc = document.createElement("p");
  desc.textContent = task.status === "completed" ? "Nice work — task completed." : task.status === "progress" ? "Currently in progress." : "Ready when you are.";

  const footer = document.createElement("div");
  footer.className = "card-footer";
  const status = document.createElement("select");
  status.className = "status-select";
  status.setAttribute("aria-label", "Change task status");
  [["todo","To Do"],["progress","In Progress"],["completed","Completed"]].forEach(([value,label]) => {
    const option = document.createElement("option");
    option.value = value; option.textContent = label; option.selected = task.status === value;
    status.appendChild(option);
  });
  status.addEventListener("change", async () => {
    try { await api(`/api/tasks/${task.id}`, { method: "PUT", body: JSON.stringify({ status: status.value }) }); await loadTasks(); }
    catch (err) { alert(err.message); }
  });

  const actions = document.createElement("div");
  actions.className = "card-actions";
  const edit = document.createElement("button");
  edit.className = "small-action edit-action"; edit.textContent = "Edit"; edit.type = "button";
  edit.addEventListener("click", () => openModal(task));
  const del = document.createElement("button");
  del.className = "small-action delete-action"; del.textContent = "Delete"; del.type = "button";
  del.addEventListener("click", async () => {
    if (!confirm(`Delete "${task.title}"?`)) return;
    try { await api(`/api/tasks/${task.id}`, { method: "DELETE" }); await loadTasks(); }
    catch (err) { alert(err.message); }
  });
  actions.append(edit, del);
  footer.append(status, actions);
  card.append(top, title, desc, footer);
  return card;
}
loadTasks();
