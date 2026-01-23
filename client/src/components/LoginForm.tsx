import { createSignal } from 'solid-js';
import api from '../lib/api.ts';

export default function LoginForm() {
  const [email, setEmail] = createSignal('');
  const [password, setPassword] = createSignal('');
  const [loading, setLoading] = createSignal(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (loading()) return; // Takroriy bosishdan himoya
    
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { 
        email: email(), 
        password: password() 
      });
      
      // Tokenni saqlash
      localStorage.setItem('token', res.data.token);
      
      // Dashbordga o'tish (window.location o'rniga Astro loyihada sekinroq lekin ishonchli usul)
      alert('Xush kelibsiz, ' + res.data.user.fullName);
      window.location.assign('/dashboard'); 
      
    } catch (err: any) {
      // Backend'dan kelgan aniq xabar yoki default xabar
      alert(err.response?.data?.message || 'Email yoki parol xato!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} class="flex flex-col gap-4 p-6 bg-white rounded shadow-md">
      <input 
        type="email" 
        placeholder="Email" 
        required
        onInput={(e) => setEmail(e.currentTarget.value)} 
        class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
      />
      <input 
        type="password" 
        placeholder="Parol" 
        required
        onInput={(e) => setPassword(e.currentTarget.value)} 
        class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
      />
      <button 
        disabled={loading()} 
        type="submit" 
        class={`bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition ${loading() ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {loading() ? 'Yuklanmoqda...' : 'Kirish'}
      </button>
    </form>
  );
}