import { createSignal, onMount, Show, For } from "solid-js";
import api from "../lib/api.ts";

interface Todo {
  id: number;
  title: string;
  description?: string;
  isCompleted: boolean;
  isRepeatable: boolean;
  repeatDays?: string;
  remindAt?: string;
  ownerId: number;
  owner: { fullName: string; email: string };
}

export default function TodoList() {
  const [user, setUser] = createSignal<any>(null);
  const [todos, setTodos] = createSignal<Todo[]>([]);
  const [loading, setLoading] = createSignal(true);

  const [editingTodoId, setEditingTodoId] = createSignal<number | null>(null);
  const [title, setTitle] = createSignal("");
  const [desc, setDesc] = createSignal("");
  const [remindTime, setRemindTime] = createSignal("12:00");

  const [specificDate, setSpecificDate] = createSignal("");
  const [selectedDays, setSelectedDays] = createSignal<number[]>([]);

  const [activeShareTodo, setActiveShareTodo] = createSignal<number | null>(
    null,
  );
  const [shareEmail, setShareEmail] = createSignal("");

  const [inviteToken, setInviteToken] = createSignal<string | null>(null);
  const [showInviteModal, setShowInviteModal] = createSignal(false);

  const weekDays = [
    { id: 1, label: "Mon" },
    { id: 2, label: "Tue" },
    { id: 3, label: "Wed" },
    { id: 4, label: "Thu" },
    { id: 5, label: "Fri" },
    { id: 6, label: "Sat" },
    { id: 7, label: "Sun" },
  ];

  const todayStr = new Date().toISOString().split("T")[0];

  onMount(loadData);

  async function loadData() {
    try {
      const [u, t] = await Promise.all([api.get("/user/me"), api.get("/todo")]);
      setUser(u.data);
      setTodos(t.data);
    } catch (err) {
      console.error("Data upload error!");
    } finally {
      setLoading(false);
    }
  }

  const toggleDay = (id: number) => {
    setSpecificDate("");
    setSelectedDays((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id].sort(),
    );
  };

  const handleDateChange = (date: string) => {
    setSpecificDate(date);
    setSelectedDays([]);
  };

  const handleSave = async (e: Event) => {
    e.preventDefault();
    if (!title()) return;

    const [h, m] = remindTime().split(":");
    const now = new Date();
    let finalRemindAt = new Date();

    if (specificDate()) {
      finalRemindAt = new Date(specificDate());
    }
    finalRemindAt.setHours(+h, +m, 0, 0);

    if (selectedDays().length === 0 && finalRemindAt < now) {
      alert("You can't set a reminder for a time that has already passed!");
      return;
    }

    const payload = {
      title: title(),
      description: desc(),
      isRepeatable: selectedDays().length > 0,
      repeatDays: selectedDays().length > 0 ? selectedDays().join(",") : null,
      remindAt: finalRemindAt.toISOString(),
    };

    try {
      if (editingTodoId()) {
        const res = await api.patch(`/todo/${editingTodoId()}`, payload);
        setTodos((prev) =>
          prev.map((t) => (t.id === editingTodoId() ? res.data : t)),
        );
      } else {
        const res = await api.post("/todo", payload);
        setTodos((prev) => [res.data, ...prev]);
      }
      resetForm();
    } catch (err) {
      alert("Error!");
    }
  };

  const toggleComplete = async (todo: Todo) => {
    try {
      const res = await api.patch(`/todo/${todo.id}`, {
        isCompleted: !todo.isCompleted,
      });
      setTodos((prev) => prev.map((t) => (t.id === todo.id ? res.data : t)));
    } catch (e) {
      console.error(e);
    }
  };

  const startEdit = (todo: Todo) => {
    setEditingTodoId(todo.id);
    setTitle(todo.title);
    setDesc(todo.description || "");
    if (todo.remindAt) {
      const d = new Date(todo.remindAt);
      setRemindTime(
        `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`,
      );
      if (!todo.isRepeatable)
        setSpecificDate(new Date(todo.remindAt).toISOString().split("T")[0]);
    }
    if (todo.isRepeatable) {
      setSelectedDays(todo.repeatDays!.split(",").map(Number));
      setSpecificDate("");
    }
  };

  const deleteTodo = async (id: number) => {
    if (!confirm("O'chirilsinmi?")) return;
    try {
      await api.delete(`/todo/${id}`);
      setTodos((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      alert("Xato!");
    }
  };

  const resetForm = () => {
    setEditingTodoId(null);
    setTitle("");
    setDesc("");
    setRemindTime("12:00");
    setSpecificDate("");
    setSelectedDays([]);
  };

  const handleGenerateInvite = async (todoId: number) => {
    try {
      const res = await api.post(`/todo/${todoId}/invite`);
      setInviteToken(res.data.token);
      setShowInviteModal(true);
    } catch (err) {
      alert("Invite link yaratishda xato!");
    }
  };

  const copyToClipboard = (token: string) => {
    const url = `${window.location.origin}/join/${token}`;
    navigator.clipboard.writeText(url);
    alert("Link nusxalandi!");
  };

  return (
    <div class="min-h-screen bg-[#F8FAFC] font-sans text-slate-900">
      <Show when={activeShareTodo()}>
        <div class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div class="bg-white rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl space-y-6">
            <h2 class="text-2xl font-black">Share todo</h2>
            <input
              type="email"
              placeholder="Foydalanuvchi emaili"
              onInput={(e) => setShareEmail(e.currentTarget.value)}
              class="w-full p-4 bg-slate-100 rounded-2xl outline-none border-2 border-transparent focus:border-blue-500 transition-all"
            />
            <div class="flex gap-3">
              <button
                onClick={() => {
                  setActiveShareTodo(null);
                  setShareEmail("");
                }}
                class="flex-1 py-4 font-bold text-slate-400"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  api
                    .post("/todo/share", {
                      todoId: activeShareTodo(),
                      email: shareEmail(),
                    })
                    .then(() => {
                      alert("Submited!");
                      setActiveShareTodo(null);
                    })
                }
                class="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </Show>

      <div class="max-w-7xl mx-auto p-6 space-y-10">
        <header class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 class="text-4xl font-black tracking-tighter">Todo List.</h1>
            <p class="text-slate-400 font-medium">
              Welcome,{" "}
              <span class="text-slate-900 font-bold">{user()?.fullName}</span>
            </p>
          </div>
          <div class="flex items-center gap-4">
            <Show
              when={user()?.telegramId}
              fallback={
                <a
                  href={`https://t.me/todo_kh_bot?start=${user()?.id}`}
                  target="_blank"
                  class="px-6 py-3 bg-[#0088cc] text-white rounded-2xl font-bold flex items-center gap-2 hover:shadow-lg transition-all"
                >
                  Telegram Connect
                </a>
              }
            >
              <div class="px-6 py-3 bg-green-50 text-green-600 rounded-2xl font-bold border border-green-100 flex items-center gap-2">
                <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>{" "}
                Telegram Connected
              </div>
            </Show>
            <button
              onClick={() => {
                localStorage.clear();
                location.href = "/";
              }}
              class="p-3 bg-white text-red-500 rounded-2xl border border-red-50 hover:bg-red-50 transition"
            >
              <svg
                width="24"
                height="24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                viewBox="0 0 24 24"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9" />
              </svg>
            </button>
          </div>
        </header>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div class="lg:col-span-5 space-y-6 sticky">
            <div class="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm sticky top-10">
              <h2 class="text-xl font-black mb-6 text-slate-800">
                {editingTodoId() ? "Edit" : "New Todo"}
              </h2>
              <form onSubmit={handleSave} class="space-y-6">
                <div class="space-y-4">
                  <input
                    type="text"
                    placeholder="Write Todo?"
                    value={title()}
                    onInput={(e) => setTitle(e.currentTarget.value)}
                    class="w-full text-2xl font-bold outline-none border-b-2 border-slate-100 focus:border-blue-500 pb-2 transition-all placeholder:text-slate-200"
                    required
                  />
                  <textarea
                    placeholder="Description (optional)..."
                    value={desc()}
                    onInput={(e) => setDesc(e.currentTarget.value)}
                    class="w-full p-4 bg-slate-50 rounded-2xl outline-none h-24 text-slate-600 font-medium"
                  />
                </div>

                <div class="flex justify-center py-2">
                  <input
                    type="time"
                    value={remindTime()}
                    onInput={(e) => setRemindTime(e.currentTarget.value)}
                    class="text-4xl font-light text-slate-700 bg-transparent outline-none cursor-pointer"
                  />
                </div>

                <div class="space-y-4">
                  <div class="flex justify-between items-center">
                    <span class="text-sm font-black text-slate-400 uppercase tracking-widest">
                      Repeatable
                    </span>
                    <div class="h-[2px] flex-1 mx-4 bg-slate-50"></div>
                  </div>
                  <div class="flex justify-between bg-slate-50 p-2 rounded-2xl">
                    <For each={weekDays}>
                      {(day) => (
                        <button
                          type="button"
                          onClick={() => toggleDay(day.id)}
                          class={`w-10 h-10 rounded-full font-bold transition-all ${
                            selectedDays().includes(day.id)
                              ? "bg-blue-600 text-white shadow-lg shadow-blue-200 scale-110"
                              : "text-slate-400 hover:bg-slate-200"
                          }`}
                        >
                          {day.label}
                        </button>
                      )}
                    </For>
                  </div>
                </div>

                <div class="relative flex py-2 items-center">
                  <div class="grow border-t border-slate-100"></div>
                  <span class="shrink mx-4 text-slate-300 font-bold text-xs uppercase">
                    Or
                  </span>
                  <div class="grow border-t border-slate-100"></div>
                </div>

                <div class="space-y-2">
                  <label class="text-[10px] font-black text-slate-400 uppercase ml-2">
                    One-time date
                  </label>
                  <input
                    type="date"
                    min={todayStr}
                    value={specificDate()}
                    onChange={(e) => handleDateChange(e.currentTarget.value)}
                    class="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-slate-600 border-2 border-transparent focus:border-blue-100 transition-all"
                  />
                </div>

                <div class="flex gap-2 pt-4">
                  <button
                    type="submit"
                    class="flex-1 bg-slate-900 text-white py-5 rounded-[1.5rem] font-black text-lg hover:bg-blue-600 transition-all active:scale-95 shadow-xl shadow-slate-200"
                  >
                    {editingTodoId() ? "Edt" : "Enter"}
                  </button>
                  <Show when={editingTodoId()}>
                    <button
                      type="button"
                      onClick={resetForm}
                      class="px-8 bg-slate-100 text-slate-400 rounded-[1.5rem] font-bold hover:bg-slate-200"
                    >
                      X
                    </button>
                  </Show>
                </div>
              </form>
            </div>
          </div>

          <div class="lg:col-span-7 space-y-4">
            <Show
              when={!loading()}
              fallback={
                <div class="py-20 text-center font-bold text-slate-300 animate-pulse">
                  Loading...
                </div>
              }
            >
              <For
                each={todos()}
                fallback={
                  <div class="py-20 text-center text-slate-300 font-black uppercase tracking-[0.2em]">
                    You don't have todo
                  </div>
                }
              >
                {(todo) => (
                  <div
                    class={`group p-6 bg-white rounded-[2.5rem] border border-slate-100 transition-all flex flex-col gap-4 ${todo.isCompleted ? "bg-slate-50/50 opacity-50" : "hover:border-blue-200 shadow-sm hover:shadow-md"}`}
                  >
                    <div class="flex justify-between items-start">
                      <div class="flex gap-5">
                        <button
                          onClick={() => toggleComplete(todo)}
                          class={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${todo.isCompleted ? "bg-blue-600 border-blue-600 text-white" : "border-slate-200 hover:border-blue-400"}`}
                        >
                          <Show when={todo.isCompleted}>
                            <svg
                              width="16"
                              height="16"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="4"
                              viewBox="0 0 24 24"
                            >
                              <path d="M20 6 9 17l-5-5" />
                            </svg>
                          </Show>
                        </button>
                        <div>
                          <h3
                            class={`text-xl font-bold leading-tight ${todo.isCompleted ? "line-through text-slate-300" : "text-slate-800"}`}
                          >
                            {todo.title}
                          </h3>
                          <Show when={todo.description}>
                            <p class="text-slate-400 text-sm mt-1">
                              {todo.description}
                            </p>
                          </Show>
                        </div>
                      </div>

                      <div class="flex gap-1 md:opacity-0 group-hover:opacity-100 transition-all">
                      <Show when={todo.ownerId === user()?.id}>
                        <button
                          onClick={() => handleGenerateInvite(todo.id)}
                          class="p-2 text-slate-300 hover:text-purple-500 hover:bg-purple-50 rounded-xl"
                          title="Invite Link"
                        >
                          <svg
                            width="20"
                            height="20"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            viewBox="0 0 24 24"
                          >
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                          </svg>
                        </button>
                      </Show>  
                        <button
                          onClick={() => setActiveShareTodo(todo.id)}
                          class="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl"
                        >
                          <svg
                            width="20"
                            height="20"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            viewBox="0 0 24 24"
                          >
                            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                            <path d="m16 6-4-4-4 4M12 2v13" />
                          </svg>
                        </button>
                        <button
                          onClick={() => startEdit(todo)}
                          class="p-2 text-slate-300 hover:text-orange-500 hover:bg-orange-50 rounded-xl"
                        >
                          <svg
                            width="20"
                            height="20"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            viewBox="0 0 24 24"
                          >
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => deleteTodo(todo.id)}
                          class="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl"
                        >
                          <svg
                            width="20"
                            height="20"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            viewBox="0 0 24 24"
                          >
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div class="flex flex-wrap gap-2 border-t pt-4 border-slate-50">
                      <Show when={todo.remindAt}>
                        <span class="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-tighter">
                          ⏰{" "}
                          {new Date(todo.remindAt!).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {!todo.isRepeatable &&
                            ` (${new Date(todo.remindAt!).toLocaleDateString()})`}
                        </span>
                      </Show>
                      <Show when={todo.isRepeatable && todo.repeatDays}>
                        <span class="px-3 py-1 bg-orange-50 text-orange-600 rounded-lg text-[10px] font-black uppercase tracking-tighter">
                          🔁{" "}
                          {todo.repeatDays
                            ?.split(",")
                            .map(
                              (d) => weekDays.find((wd) => wd.id === +d)?.label,
                            )
                            .join(" ")}
                        </span>
                      </Show>
                      <Show when={todo.ownerId !== user()?.id}>
                        <span class="px-3 py-1 bg-slate-100 text-slate-400 rounded-lg text-[10px] font-black uppercase tracking-tighter">
                          👤 From: {todo.owner?.fullName}
                        </span>
                      </Show>
                    </div>
                  </div>
                )}
              </For>
            </Show>
            <Show when={showInviteModal()}>
              <div class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                <div class="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl text-center space-y-6">
                  <div class="w-20 h-20 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto">
                    <svg
                      width="40"
                      height="40"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      viewBox="0 0 24 24"
                    >
                      <path d="M13.828 10.172a4 4 0 0 0-5.656 0l-4 4a4 4 0 1 0 5.656 5.656l1.102-1.101m-.758-4.899a4 4 0 0 0 5.656 0l4-4a4 4 0 0 0-5.656-5.656l-1.1 1.1"></path>
                    </svg>
                  </div>
                  <div>
                    <h2 class="text-2xl font-black">Invite Link</h2>
                    <p class="text-slate-400 mt-2">
                      Bu linkni do'stlaringizga yuboring
                    </p>
                  </div>

                  <div class="bg-slate-50 p-4 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-between">
                    <code class="font-mono font-bold text-purple-600">
                      {inviteToken()}
                    </code>
                    <button
                      onClick={() => copyToClipboard(inviteToken()!)}
                      class="text-xs bg-purple-600 text-white px-3 py-1 rounded-lg font-bold hover:bg-purple-700"
                    >
                      Copy URL
                    </button>
                  </div>

                  <button
                    onClick={() => setShowInviteModal(false)}
                    class="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold hover:bg-slate-200"
                  >
                    Close
                  </button>
                </div>
              </div>
            </Show>
          </div>
        </div>
      </div>
    </div>
  );
}
