import { createSignal } from 'solid-js';
import api from '../lib/api.ts'; // .ts kengaytmasini aniq ko'rsatish yaxshi amaliyot

export default function RegisterForm() {
  const [email, setEmail] = createSignal('');
  const [password, setPassword] = createSignal('');
  const [fullName, setFullName] = createSignal('');
  const [error, setError] = createSignal('');
  const [loading, setLoading] = createSignal(false);

  const handleRegister = async (e: Event) => {
    e.preventDefault();
    if (loading()) return;

    // Oddiy frontend tekshiruvi (Backendga yukni kamaytirish uchun)
    if (fullName().length < 3) {
      setError("Ism-familiya kamida 3 ta belgidan iborat bo'lishi kerak");
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post('/auth/register', {
        email: email(),
        password: password(),
        fullName: fullName()
      });

      alert("Muvaffaqiyatli ro'yxatdan o'tdingiz! Endi tizimga kiring.");
      window.location.href = '/'; // Login sahifasiga
    } catch (err: any) {
      // Backend'dan keladigan murakkab xatolarni handle qilish
      const responseData = err.response?.data;
      
      if (responseData?.errors) {
        // Zod flatten() xatolarini chiroyli ko'rsatish
        const firstErrorField = Object.keys(responseData.errors)[0];
        const firstErrorMessage = responseData.errors[firstErrorField][0];
        setError(`${firstErrorField}: ${firstErrorMessage}`);
      } else {
        setError(responseData?.message || "Ro'yxatdan o'tishda xatolik yuz berdi");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
      <h2 class="text-2xl font-bold mb-6 text-gray-800">Hisob yaratish</h2>
      
      {error() && (
        <div class="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm font-medium border border-red-100">
          {error()}
        </div>
      )}

      <form onSubmit={handleRegister} class="space-y-4">
        <div>
          <label class="text-sm font-semibold text-gray-600 block mb-1">Ism-familiya</label>
          <input 
            type="text" 
            required
            onInput={(e) => setFullName(e.currentTarget.value)}
            class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            placeholder="Ali Valiyev"
          />
        </div>

        <div>
          <label class="text-sm font-semibold text-gray-600 block mb-1">Email</label>
          <input 
            type="email" 
            required
            onInput={(e) => setEmail(e.currentTarget.value)}
            class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            placeholder="misol@gmail.com"
          />
        </div>

        <div>
          <label class="text-sm font-semibold text-gray-600 block mb-1">Parol</label>
          <input 
            type="password" 
            required
            onInput={(e) => setPassword(e.currentTarget.value)}
            class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            placeholder="********"
          />
        </div>

        <button 
          disabled={loading()}
          type="submit" 
          class={`w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 active:scale-95 transition-all cursor-pointer ${loading() ? 'opacity-50' : ''}`}
        >
          {loading() ? "Yuklanmoqda..." : "Ro'yxatdan o'tish"}
        </button>
      </form>
    </div>
  );
}