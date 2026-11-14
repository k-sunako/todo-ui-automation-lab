(() => {
  "use strict";

  const STORAGE_KEY = "todo-ui-automation-lab.v1";
  const MAX_TASKS = 200;

  const form = document.querySelector("#add-form");
  const taskInput = document.querySelector("#task-input");
  const todoList = document.querySelector("#todo-list");
  const emptyState = document.querySelector("#empty-state");
  const emptyTitle = document.querySelector("#empty-title");
  const emptyCopy = document.querySelector("#empty-copy");
  const taskSummary = document.querySelector("#task-summary");
  const liveMessage = document.querySelector("#live-message");
  const filterGroup = document.querySelector("#filter-group");
  const clearCompletedButton = document.querySelector("#clear-completed");

  let tasks = loadTasks();
  let currentFilter = "all";

  function loadTasks() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) return [];

      return parsed
        .filter((task) => task && typeof task.id === "string" && typeof task.title === "string")
        .map((task) => ({
          id: task.id,
          title: task.title,
          completed: Boolean(task.completed),
        }))
        .slice(0, MAX_TASKS);
    } catch {
      return [];
    }
  }

  function saveTasks() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
      return true;
    } catch {
      announce("このブラウザーではタスクを保存できませんでした。");
      return false;
    }
  }

  function makeId() {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
      return globalThis.crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function announce(message) {
    liveMessage.textContent = "";
    window.setTimeout(() => {
      liveMessage.textContent = message;
    }, 20);
  }

  function visibleTasks() {
    if (currentFilter === "active") return tasks.filter((task) => !task.completed);
    if (currentFilter === "completed") return tasks.filter((task) => task.completed);
    return tasks;
  }

  function makeTaskElement(task) {
    const item = document.createElement("li");
    item.className = "todo-item";
    item.dataset.todoId = task.id;
    if (task.completed) item.classList.add("is-completed");

    const label = document.createElement("label");
    label.className = "todo-label";

    const checkbox = document.createElement("input");
    checkbox.className = "todo-checkbox";
    checkbox.type = "checkbox";
    checkbox.checked = task.completed;
    checkbox.dataset.action = "toggle";
    checkbox.dataset.id = task.id;
    checkbox.setAttribute(
      "aria-label",
      task.completed ? `${task.title}を未完了に戻す` : `${task.title}を完了にする`,
    );

    const title = document.createElement("span");
    title.className = "todo-title";
    title.textContent = task.title;

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-button";
    deleteButton.type = "button";
    deleteButton.dataset.action = "delete";
    deleteButton.dataset.id = task.id;
    deleteButton.setAttribute("aria-label", `${task.title}を削除`);
    deleteButton.innerHTML = '<span aria-hidden="true">×</span>';

    label.append(checkbox, title);
    item.append(label, deleteButton);
    return item;
  }

  function render(focusTaskId = null) {
    const shown = visibleTasks();
    const fragment = document.createDocumentFragment();
    for (const task of shown) fragment.append(makeTaskElement(task));
    todoList.replaceChildren(fragment);

    const noTasksAtAll = tasks.length === 0;
    emptyState.hidden = shown.length > 0;
    if (noTasksAtAll) {
      emptyTitle.textContent = "まだタスクはありません";
      emptyCopy.textContent = "上の入力欄から、最初の一歩を追加しましょう。";
    } else {
      emptyTitle.textContent = "表示するタスクはありません";
      emptyCopy.textContent = "別の絞り込み条件を選んでみてください。";
    }

    const remaining = tasks.filter((task) => !task.completed).length;
    const completed = tasks.length - remaining;
    if (tasks.length === 0) {
      taskSummary.textContent = "タスクはまだありません";
    } else if (remaining === 0) {
      taskSummary.textContent = `すべて完了・${tasks.length}件`;
    } else {
      taskSummary.textContent = `${remaining}件が残っています`;
    }
    clearCompletedButton.disabled = completed === 0;

    if (focusTaskId) focusTaskCheckbox(focusTaskId);
  }

  function focusTaskCheckbox(taskId) {
    const checkbox = [...todoList.querySelectorAll('input[data-action="toggle"]')]
      .find((element) => element.dataset.id === taskId);
    if (checkbox) checkbox.focus();
    else taskInput.focus();
  }

  function getNextFocusId(item) {
    const next = item.nextElementSibling;
    const previous = item.previousElementSibling;
    return next?.dataset.todoId ?? previous?.dataset.todoId ?? null;
  }

  function addTask(title) {
    const task = { id: makeId(), title, completed: false };
    tasks.unshift(task);
    if (tasks.length > MAX_TASKS) tasks.length = MAX_TASKS;
    saveTasks();
    render();
    announce(`「${title}」を追加しました。`);
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const title = taskInput.value.trim();
    if (!title) {
      taskInput.focus();
      return;
    }

    addTask(title);
    taskInput.value = "";
    taskInput.focus();
  });

  filterGroup.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-filter]");
    if (!button) return;

    currentFilter = button.dataset.filter;
    for (const filterButton of filterGroup.querySelectorAll("button[data-filter]")) {
      const selected = filterButton === button;
      filterButton.classList.toggle("is-selected", selected);
      filterButton.setAttribute("aria-pressed", String(selected));
    }
    render();
  });

  todoList.addEventListener("change", (event) => {
    const checkbox = event.target.closest('input[data-action="toggle"]');
    if (!checkbox) return;

    const task = tasks.find((item) => item.id === checkbox.dataset.id);
    if (!task) return;

    const item = checkbox.closest(".todo-item");
    const focusTaskId = getNextFocusId(item);
    task.completed = checkbox.checked;
    saveTasks();

    const hiddenByFilter =
      (currentFilter === "active" && task.completed) ||
      (currentFilter === "completed" && !task.completed);

    if (hiddenByFilter) render(focusTaskId);
    else {
      item.classList.toggle("is-completed", task.completed);
      checkbox.setAttribute(
        "aria-label",
        task.completed ? `${task.title}を未完了に戻す` : `${task.title}を完了にする`,
      );
      const remaining = tasks.filter((entry) => !entry.completed).length;
      taskSummary.textContent = remaining === 0
        ? `すべて完了・${tasks.length}件`
        : `${remaining}件が残っています`;
      clearCompletedButton.disabled = remaining === tasks.length;
    }

    announce(task.completed ? `「${task.title}」を完了にしました。` : `「${task.title}」を未完了に戻しました。`);
  });

  todoList.addEventListener("click", (event) => {
    const button = event.target.closest('button[data-action="delete"]');
    if (!button) return;

    const task = tasks.find((item) => item.id === button.dataset.id);
    if (!task) return;

    const item = button.closest(".todo-item");
    const focusTaskId = getNextFocusId(item);
    tasks = tasks.filter((entry) => entry.id !== task.id);
    saveTasks();
    render(focusTaskId);
    announce(`「${task.title}」を削除しました。`);
  });

  clearCompletedButton.addEventListener("click", () => {
    const completedCount = tasks.filter((task) => task.completed).length;
    if (completedCount === 0) return;

    tasks = tasks.filter((task) => !task.completed);
    saveTasks();
    render();
    announce(`完了済みのタスク${completedCount}件を片づけました。`);
  });

  render();
})();
