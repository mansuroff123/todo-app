import { createSignal, onMount, Show, For, onCleanup } from "solid-js";
import api from "./lib/api.ts";
import { socket } from "./lib/sockets.ts"; 
import type { Todo } from "./types";
import TodoItem from "./components/TodoItem";
import ShareModal from "./components/ShareModal";
import InviteModal from "./components/InviteModal";

export default function TodoList() {
  const [user, setUser] = createSignal<any>(null);
  const [todos, setTodos] = createSignal<Todo[]>([]);
  const [loading, setLoading] = createSignal(true);

  // Form states
  const [editingTodoId, setEditingTodoId] = createSignal<number | null>(null);
  const [title, setTitle] = createSignal("");
  const [desc, setDesc] = createSignal("");
  const [remindTime, setRemindTime] = createSignal("12:00");
  const [specificDate, setSpecificDate] = createSignal("");
  const [selectedDays, setSelectedDays] = createSignal<number[]>([]);
  
  // Modal states
  const [activeShareTodo, setActiveShareTodo] = createSignal<number | null>(null);
  const [shareEmail, setShareEmail] = createSignal("");
  const [inviteToken, setInviteToken] = createSignal<string | null>(null);
  const [showInviteModal, setShowInviteModal] = createSignal(false);
  const [currentInviteTodoId, setCurrentInviteTodoId] = createSignal<number | null>(null);
  const [serverCanEdit, setServerCanEdit] = createSignal(false);

  const weekDays = [
    { id: 1, label: "Mon" }, { id: 2, label: "Tue" }, { id: 3, label: "Wed" },
    { id: 4, label: "Thu" }, { id: 5, label: "Fri" }, { id: 6, label: "Sat" }, { id: 7, label: "Sun" },
  ];
  const todayStr = new Date().toISOString().split("T")[0];

  onMount(async () => {
    try {
      const [u, t] = await Promise.all([api.get("/user/me"), api.get("/todo")]);
      setUser(u.data);
      setTodos(t.data);

      socket.emit('join', String(u.data.id));

      socket.on('permission_updated', (data: { todoId: number, canEdit: boolean }) => {
        setTodos(prev => prev.map(t => t.id === data.todoId ? { ...t, canEdit: data.canEdit } : t));
        if (editingTodoId() === data.todoId && !data.canEdit) {
          resetForm();
          alert("Ushbu vazifani tahrirlash huquqingiz bekor qilindi.");
        }
      });

      socket.on('todo_updated', (updatedTodo: Todo) => {
        setTodos(prev => prev.map(t => t.id === updatedTodo.id ? { ...t, ...updatedTodo } : t));
      });

      socket.on('todo_deleted', (data: { todoId: number }) => {
        setTodos(prev => prev.filter(t => t.id !== data.todoId));
      });

      socket.on('todo_shared', (data: any) => {
        api.get("/todo").then(res => setTodos(res.data));
      });

    } catch (err) {
      console.error("Ma'lumotlarni yuklashda xato");
    } finally {
      setLoading(false);
    }
  });

  onCleanup(() => {
    socket.off('permission_updated');
    socket.off('todo_updated');
    socket.off('todo_deleted');
    socket.off('todo_shared');
  });

  const resetForm = () => {
    setEditingTodoId(null);
    setTitle("");
    setDesc("");
    setRemindTime("12:00");
    setSpecificDate("");
    setSelectedDays([]);
  };

  const handleSave = async (e: Event) => {
    e.preventDefault();
    if (!title()) return;
    
    const [h, m] = remindTime().split(":");
    let finalRemindAt = specificDate() ? new Date(specificDate()) : new Date();
    finalRemindAt.setHours(+h, +m, 0, 0);

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
        setTodos(prev => prev.map(t => t.id === editingTodoId() ? res.data : t));
      } else {
        const res = await api.post("/todo", payload);
        setTodos(prev => [res.data, ...prev]);
      }
      resetForm();
    } catch (err) {
      alert("Xato yuz berdi! Ruxsatingizni tekshiring.");
    }
  };

  const handleGenerateInvite = async (todoId: number) => {
    try {
      const res = await api.post(`/todo/${todoId}/invite`, {}); 
      setInviteToken(res.data.token);
      setServerCanEdit(res.data.canEdit); 
      setCurrentInviteTodoId(todoId);
      setShowInviteModal(true);
    } catch (err) {
      alert("Xato yuz berdi");
    }
  };

  const toggleDay = (id: number) => {
    setSpecificDate("");
    setSelectedDays(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id].sort());
  };

  const startEdit = (todo: Todo) => {
    setEditingTodoId(todo.id);
    setTitle(todo.title);
    setDesc(todo.description || "");
    
    if (todo.remindAt) {
      const d = new Date(todo.remindAt);
      setRemindTime(`${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`);
      if (!todo.isRepeatable) {
        setSpecificDate(d.toISOString().split("T")[0]);
      }
    }
    
    if (todo.isRepeatable && todo.repeatDays) {
      setSelectedDays(todo.repeatDays.split(",").map(Number));
      setSpecificDate("");
    } else {
      setSelectedDays([]);
    }
  };

  const deleteTodo = async (id: number) => {
    if (!confirm("O'chirilsinmi?")) return;
    try {
      await api.delete(`/todo/${id}`);
      setTodos(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      alert("O'chirishda xatolik!");
    }
  };

  const toggleComplete = async (todo: Todo) => {
    try {
      const res = await api.patch(`/todo/${todo.id}`, { isCompleted: !todo.isCompleted });
      setTodos(prev => prev.map(t => t.id === todo.id ? res.data : t));
    } catch (err) {
      alert("Ruxsat yo'q!");
    }
  };
  onMount(async () => {
  try {
    const [u, t] = await Promise.all([api.get("/user/me"), api.get("/todo")]);
    setUser(u.data);
    setTodos(t.data);

    socket.emit('join', String(u.data.id));

    socket.on('telegram_connected', (updatedUser: any) => {
      setUser(updatedUser);
      console.log("Telegram connected via Socket!");
    });

  } catch (err) {
     console.error(err);
  }
});

onCleanup(() => {
  socket.off('telegram_connected');
  // ...
});

  return (
    <div class="min-h-screen bg-[#F8FAFC] font-sans text-slate-900">
      <ShareModal
        todoId={activeShareTodo()}
        email={shareEmail()}
        onEmailInput={setShareEmail}
        onClose={() => { setActiveShareTodo(null); setShareEmail(""); }}
      />
      <InviteModal
        show={showInviteModal()}
        token={inviteToken()}
        todoId={currentInviteTodoId()}
        initialCanEdit={serverCanEdit()}
        onClose={() => setShowInviteModal(false)}
      />

      <div class="max-w-7xl mx-auto p-6 space-y-10">
        <header class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 class="text-4xl font-black tracking-tighter">Todo List.</h1>
            <p class="text-slate-400 font-medium">
              Welcome, <span class="text-slate-900 font-bold">{user()?.fullName}</span>
            </p>
          </div>
          <div class="flex items-center gap-4">
            <Show when={user()?.telegramId} fallback={
              <a href={`https://t.me/todo_kh_bot?start=${user()?.id}`} target="_blank" class="px-6 py-3 bg-[#0088cc] text-white rounded-2xl font-bold flex items-center gap-2 hover:shadow-lg transition-all">
                Telegram Connect
              </a>
              }>
              <div class="px-6 py-3 bg-green-50 text-green-600 rounded-2xl font-bold border border-green-100 flex items-center gap-2">
                <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Telegram Connected
              </div>
            </Show>
            <button onClick={() => { localStorage.clear(); location.href = "/"; }} class="p-3 bg-white text-red-500 rounded-2xl border border-red-50 hover:bg-red-50 transition">
              <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9" /></svg>
            </button>
          </div>
        </header>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div class="lg:col-span-5">
            <div class="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm sticky top-10">
              <h2 class="text-xl font-black mb-6 text-slate-800">{editingTodoId() ? "Edit Task" : "New Todo"}</h2>
              <form onSubmit={handleSave} class="space-y-6">
                <input value={title()} onInput={(e) => setTitle(e.currentTarget.value)} class="w-full text-2xl font-bold outline-none border-b-2 border-slate-100 focus:border-blue-500 pb-2" placeholder="Write Todo?" required />
                <textarea value={desc()} onInput={(e) => setDesc(e.currentTarget.value)} class="w-full p-4 bg-slate-50 rounded-2xl outline-none h-24" placeholder="Description..." />
                
                <div class="flex justify-center py-2">
                  <input type="time" value={remindTime()} onInput={(e) => setRemindTime(e.currentTarget.value)} class="text-4xl font-light text-slate-700 bg-transparent outline-none" />
                </div>

                <div class="flex justify-between bg-slate-50 p-2 rounded-2xl">
                  <For each={weekDays}>{(day) => (
                    <button type="button" onClick={() => toggleDay(day.id)} class={`w-10 h-10 rounded-full font-bold transition-all ${selectedDays().includes(day.id) ? "bg-blue-600 text-white" : "text-slate-400"}`}>{day.label[0]}</button>
                  )}</For>
                </div>

                <input type="date" min={todayStr} value={specificDate()} onChange={(e) => { setSpecificDate(e.currentTarget.value); setSelectedDays([]); }} class="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold" />
                
                <div class="flex gap-2">
                  <button type="submit" class="flex-1 bg-slate-900 text-white py-5 rounded-[1.5rem] font-black hover:bg-black transition-colors">{editingTodoId() ? "Update" : "Create"}</button>
                  <Show when={editingTodoId()}>
                    <button type="button" onClick={resetForm} class="px-8 bg-slate-100 text-slate-400 rounded-[1.5rem] hover:bg-slate-200 transition-colors font-bold">Cancel</button>
                  </Show>
                </div>
              </form>
            </div>
          </div>

          <div class="lg:col-span-7 space-y-4">
            <Show when={!loading()} fallback={<div class="py-20 text-center animate-pulse text-slate-300 font-bold">Loading your tasks...</div>}>
              <For each={todos()} fallback={<div class="py-20 text-center text-slate-300 font-black text-xl italic uppercase">NO TODOS FOUND</div>}>
                {(todo) => (
                  <TodoItem 
                    todo={todo} 
                    userId={user()?.id} 
                    onToggle={toggleComplete} 
                    onEdit={startEdit} 
                    onDelete={deleteTodo} 
                    onShare={setActiveShareTodo} 
                    onInvite={handleGenerateInvite} 
                    weekDays={weekDays} 
                  />
                )}
              </For>
            </Show>
          </div>
        </div>
      </div>
    </div>
  );
}