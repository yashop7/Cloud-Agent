import { useEffect, useState } from "react";

const load = () => {
  try {
    return JSON.parse(localStorage.getItem("todos")) ?? [];
  } catch {
    return [];
  }
};

export default function App() {
  const [todos, setTodos] = useState(load);
  const [text, setText] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    localStorage.setItem("todos", JSON.stringify(todos));
  }, [todos]);

  const add = (e) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    setTodos([...todos, { id: Date.now(), text: t, done: false }]);
    setText("");
  };

  const toggle = (id) =>
    setTodos(todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  const remove = (id) => setTodos(todos.filter((t) => t.id !== id));
  const clearDone = () => setTodos(todos.filter((t) => !t.done));

  const visible = todos.filter((t) =>
    filter === "all" ? true : filter === "done" ? t.done : !t.done
  );
  const left = todos.filter((t) => !t.done).length;

  return (
    <main className="app">
      <h1>Todo</h1>
      <form onSubmit={add}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What needs to be done?"
          autoFocus
        />
        <button type="submit">Add</button>
      </form>

      <div className="filters">
        {["all", "active", "done"].map((f) => (
          <button
            key={f}
            className={filter === f ? "active" : ""}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      <ul>
        {visible.map((t) => (
          <li key={t.id} className={t.done ? "done" : ""}>
            <label>
              <input
                type="checkbox"
                checked={t.done}
                onChange={() => toggle(t.id)}
              />
              <span>{t.text}</span>
            </label>
            <button className="del" onClick={() => remove(t.id)} aria-label="Delete">
              ×
            </button>
          </li>
        ))}
        {visible.length === 0 && <li className="empty">Nothing here.</li>}
      </ul>

      <footer>
        <span>{left} left</span>
        <button onClick={clearDone}>Clear completed</button>
      </footer>
    </main>
  );
}
