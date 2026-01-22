import { createSignal, onMount, Show, For } from 'solid-js';
import api from '../lib/api';

interface Todo {
  id: number;
  title: string;
  isCompleted: boolean;
}

export default function TodoList() {
  const [user, setUser] = createSignal<any>(null);
  const [todos, setTodos] = createSignal<Todo[]>([]);
  const [newTodo, setNewTodo] = createSignal('');
  const [loading, setLoading] = createSignal(true);

  onMount(async () => {
    try {
      const [userRes, todoRes] = await Promise.all([
        api.get('/user/me'),
        api.get('/todo')
      ]);
      setUser(userRes.data);
      setTodos(todoRes.data);
    } catch (err: any) {
      console.error("Auth error details:", err.response);
      if (err.response?.status === 401) {
        window.location.href = '/';
      }
    } finally {
      setLoading(false);
    }
  });

  const addTodo = async (e: Event) => {
    e.preventDefault();
    if (!newTodo().trim()) return;

    try {
      const res = await api.post('/todo', { title: newTodo() });
      setTodos([res.data, ...todos()]);
      setNewTodo('');
    } catch (err) {
      alert("Could not add task");
    }
  };

  const toggleTodo = async (id: number, currentStatus: boolean) => {
    try {
      await api.patch(`/todo/${id}`, { isCompleted: !currentStatus });
      setTodos(todos().map(t => t.id === id ? { ...t, isCompleted: !currentStatus } : t));
    } catch (err) {
      alert("Could not update task");
    }
  };

  const deleteTodo = async (id: number) => {
    if (!confirm("Are you sure?")) return;
    try {
      await api.delete(`/todo/${id}`);
      setTodos(todos().filter(t => t.id !== id));
    } catch (err) {
      alert("Could not delete task");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/';
  };

  return (
    <Show when={!loading()} fallback={<div class="text-center py-20 text-xl text-slate-500">Loading your space...</div>}>
      <div>
        <header class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
          <div>
            <h1 class="text-3xl font-black text-slate-800">
              Hello, <span class="text-blue-600">{user()?.fullName}</span>
            </h1>
            <p class="text-slate-500 font-medium">Here's your productivity dashboard.</p>
          </div>

          <div class="flex items-center gap-3">
            <a 
              href={user()?.connectLink} 
              target="_blank"
              class={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all shadow-sm border cursor-pointer ${
                user()?.telegramChatId 
                ? 'bg-green-50 text-green-600 border-green-100' 
                : 'bg-white text-[#0088cc] border-blue-100 hover:bg-blue-50'
              }`}
            >
              {user()?.telegramChatId ? 'Telegram Linked ✅' : 'Connect Telegram'}
            </a>
            
            <button 
              onClick={handleLogout}
              class="bg-red-50 text-red-600 px-4 py-2 rounded-xl font-bold hover:bg-red-100 transition-colors"
            >
              Logout
            </button>
          </div>
        </header>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left">
          
          <div class="lg:col-span-1">
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 sticky top-4">
              <h3 class="text-lg font-bold mb-4">Add New Task</h3>
              <form onSubmit={addTodo} class="space-y-4">
                <input 
                  type="text" 
                  value={newTodo()}
                  onInput={(e) => setNewTodo(e.currentTarget.value)}
                  placeholder="What's the plan?"
                  class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
                <button class="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all">
                  Create Task
                </button>
              </form>
            </div>
          </div>

          <div class="lg:col-span-2 space-y-3">
            <h3 class="text-lg font-bold mb-4">Your Tasks ({todos().length})</h3>
            <For each={todos()} fallback={<div class="text-center py-10 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 font-medium">No tasks yet. Add your first goal!</div>}>
              {(todo) => (
                <div class="group flex items-center justify-between bg-white p-4 rounded-xl border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all">
                  <div class="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      checked={todo.isCompleted} 
                      onChange={() => toggleTodo(todo.id, todo.isCompleted)}
                      class="w-5 h-5 rounded-full border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span class={`font-medium transition-all ${todo.isCompleted ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                      {todo.title}
                    </span>
                  </div>
                  <button 
                    onClick={() => deleteTodo(todo.id)}
                    class="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-500 transition-all"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  </button>
                </div>
              )}
            </For>
          </div>
        </div>
      </div>
    </Show>
  );
}