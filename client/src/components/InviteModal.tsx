import { Show, createSignal, createEffect } from "solid-js";
import api from "../lib/api.ts";

interface InviteModalProps {
  show: boolean;
  token: string | null;
  todoId: number | null;
  initialCanEdit: boolean;
  onClose: () => void;
}

export default function InviteModal(props: InviteModalProps) {
  const [canEdit, setCanEdit] = createSignal(false);

  createEffect(() => {
    if (props.show) {
      setCanEdit(props.initialCanEdit);
    }
  });

  const copyToClipboard = () => {
    const url = `${window.location.origin}/join/${props.token}`;
    navigator.clipboard.writeText(url);
    alert("Link nusxalandi! Endi uni sherigingizga yuboring.");
  };

const toggleEditAccess = async () => {
  const nextStatus = !canEdit();
  if (props.todoId) {
    try {
      setCanEdit(nextStatus);
      const res = await api.post(`/todo/${props.todoId}/invite`, { 
        canEdit: nextStatus
      });
      setCanEdit(res.data.canEdit);
    } catch (err) {
      setCanEdit(!nextStatus);
      alert("Xato!");
    }
  }
};

  return (
    <Show when={props.show}>
      <div class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
        <div class="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl space-y-6 animate-in fade-in zoom-in duration-200">
          
          <div class="text-center space-y-2">
            <h2 class="text-2xl font-black text-slate-800">Invite User</h2>
            <p class="text-slate-400 text-sm">Ushbu link orqali boshqalarni loyihaga qo'shing</p>
          </div>

          <div class="bg-slate-50 p-6 rounded-3xl border-2 border-dashed border-slate-200">
            <div class="flex items-center justify-between mb-4">
              <span class="text-xs font-bold text-slate-400 uppercase tracking-widest">Invite Link:</span>
              <code class="font-mono font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-lg">
                {props.token}
              </code>
            </div>
            
            <button 
              onClick={copyToClipboard}
              class="w-full py-4 bg-purple-600 text-white rounded-2xl font-black hover:bg-purple-700 transition-all shadow-lg shadow-purple-200 active:scale-95"
            >
              COPY INVITE URL
            </button>
          </div>

          <div 
            onClick={toggleEditAccess}
            class="flex items-center justify-between p-5 bg-slate-50 rounded-[2rem] cursor-pointer hover:bg-slate-100 transition-all border border-transparent hover:border-slate-200"
          >
            <div class="flex flex-col">
              <span class="font-bold text-slate-700">Allow Editing</span>
              <span class="text-[10px] text-slate-400 leading-tight">
                {canEdit() 
                  ? "Sherigingiz vazifani tahrirlay oladi" 
                  : "Sherigingiz faqat ko'ra oladi"}
              </span>
            </div>

            <div class={`w-14 h-7 rounded-full transition-all duration-300 flex items-center px-1 ${canEdit() ? 'bg-green-500' : 'bg-slate-300'}`}>
               <div class={`w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-300 transform ${canEdit() ? 'translate-x-7' : 'translate-x-0'}`} />
            </div>
          </div>

          <button 
            onClick={props.onClose} 
            class="w-full py-2 text-slate-400 font-bold hover:text-slate-600 transition-colors text-sm">
            Close
          </button>
        </div>
      </div>
    </Show>
  );
}