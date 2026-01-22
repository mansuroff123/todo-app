import { createSignal } from 'solid-js';
import api from '../lib/api';

export default function RegisterForm() {
  const [email, setEmail] = createSignal('');
  const [password, setPassword] = createSignal('');
  const [fullName, setFullName] = createSignal('');
  const [error, setError] = createSignal('');
  const [loading, setLoading] = createSignal(false);

  const handleRegister = async (e: Event) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post('/auth/register', {
        email: email(),
        password: password(),
        fullName: fullName()
      });

      alert("you are registred! now login.");
      window.location.href = '/';
    } catch (err: any) {
      const msg = err.response?.data?.message || "Error";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
      <h2 class="text-2xl font-bold mb-6 text-gray-800">Create account</h2>
      
      {error() && <div class="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm font-medium">{error()}</div>}

      <form onSubmit={handleRegister} class="space-y-4">
        <div>
          <label class="text-sm font-semibold text-gray-600 block mb-1">Full Name</label>
          <input 
            type="text" 
            onInput={(e) => setFullName(e.currentTarget.value)}
            class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            placeholder="John Doe"
          />
        </div>

        <div>
          <label class="text-sm font-semibold text-gray-600 block mb-1">Email</label>
          <input 
            type="email" 
            onInput={(e) => setEmail(e.currentTarget.value)}
            class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            placeholder="example@gmail.com"
          />
        </div>

        <div>
          <label class="text-sm font-semibold text-gray-600 block mb-1">Parol</label>
          <input 
            type="password" 
            onInput={(e) => setPassword(e.currentTarget.value)}
            class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            placeholder="********"
          />
        </div>

        <button 
          disabled={loading()}
          type="submit" 
          class="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
        >
          {loading() ? "Loading..." : "Registration"}
        </button>
      </form>
    </div>
  );
}