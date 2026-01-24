import { onMount, createSignal, Show } from 'solid-js';
import api from '../lib/api';

export default function JoinHandler(props: { token: string }) {
  const [status, setStatus] = createSignal<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = createSignal('Checking...');

  onMount(async () => {
    const token = props.token;
    const isAuthenticated = !!localStorage.getItem('token');

    if (!isAuthenticated) {
      localStorage.setItem('pending_invite_token', token);
      
      setStatus('error');
      setMessage('Please log in first. Redirecting...');
      
      setTimeout(() => {
        window.location.href = `/?redirect=join&token=${token}`;
      }, 2000);
      return;
    }

    try {
      const response = await api.post(`/todo/join/${token}`);
      setStatus('success');
      setMessage(response.data.message || 'Successfully joined the task!');
      
      localStorage.removeItem('pending_invite_token');

      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);
    } catch (err: any) {
      setStatus('error');
      setMessage(err.response?.data?.message || 'An error occurred.');
    }
  });

  return (
    <div class="bg-white p-10 rounded-[3rem] shadow-2xl text-center space-y-6 max-w-sm w-full">
      <Show when={status() === 'loading'}>
        <div class="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
      </Show>
      
      <div class="text-4xl">
        {status() === 'success' ? '🎉' : status() === 'error' ? '⚠️' : ''}
      </div>
      
      <p class="font-bold text-slate-800 leading-relaxed">{message()}</p>
    </div>
  );
}
