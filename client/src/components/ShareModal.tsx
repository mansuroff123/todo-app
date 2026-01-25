import { Show } from "solid-js";
import api from "../lib/api.ts";

export default function ShareModal(props: { 
  todoId: number | null, 
  onClose: () => void,
  email: string,
  onEmailInput: (val: string) => void
}) {
  const handleShare = () => {
    api.post("/todo/share", { todoId: props.todoId, email: props.email })
      .then(() => {
        alert("Submited!");
        props.onClose();
      });
  };

  return (
    <Show when={props.todoId}>
      <div class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl space-y-6">
          <h2 class="text-2xl font-black">Share todo</h2>
          <input
            type="email"
            placeholder="Foydalanuvchi emaili"
            onInput={(e) => props.onEmailInput(e.currentTarget.value)}
            class="w-full p-4 bg-slate-100 rounded-2xl outline-none border-2 border-transparent focus:border-blue-500 transition-all"
          />
          <div class="flex gap-3">
            <button onClick={props.onClose} class="flex-1 py-4 font-bold text-slate-400">Cancel</button>
            <button onClick={handleShare} class="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700">Send</button>
          </div>
        </div>
      </div>
    </Show>
  );
}