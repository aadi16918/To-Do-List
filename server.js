const express = require("express");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

let tasks = [];
let nextId = 1;

app.get("/api/tasks", (req, res) => res.json(tasks));

app.post("/api/tasks", (req, res) => {
  const { title, status = "todo", priority = "Medium" } = req.body || {};
  if (typeof title !== "string" || !title.trim()) {
    return res.status(400).json({ message: "Please enter a task title." });
  }
  if (!["todo", "progress", "completed"].includes(status)) {
    return res.status(400).json({ message: "Invalid task status." });
  }
  const task = { id: nextId++, title: title.trim(), status, priority, createdAt: new Date().toISOString() };
  tasks.push(task);
  res.status(201).json(task);
});

app.put("/api/tasks/:id", (req, res) => {
  const task = tasks.find(t => t.id === Number(req.params.id));
  if (!task) return res.status(404).json({ message: "Task not found." });

  const { title, status, priority } = req.body || {};
  if (title !== undefined) {
    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ message: "Task title cannot be empty." });
    }
    task.title = title.trim();
  }
  if (status !== undefined) {
    if (!["todo", "progress", "completed"].includes(status)) {
      return res.status(400).json({ message: "Invalid task status." });
    }
    task.status = status;
  }
  if (priority !== undefined) {
    if (!["Low", "Medium", "High"].includes(priority)) {
      return res.status(400).json({ message: "Invalid priority." });
    }
    task.priority = priority;
  }
  res.json(task);
});

app.delete("/api/tasks/:id", (req, res) => {
  const index = tasks.findIndex(t => t.id === Number(req.params.id));
  if (index < 0) return res.status(404).json({ message: "Task not found." });
  tasks.splice(index, 1);
  res.json({ message: "Task deleted." });
});

app.listen(PORT, () => console.log(`FocusFlow dashboard running at http://localhost:${PORT}`));
