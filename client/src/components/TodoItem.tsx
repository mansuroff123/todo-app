import { Show } from "solid-js";
import type { Todo } from "../types";

export default function TodoItem(props: {
  todo: Todo;
  userId: number;
  onToggle: (t: Todo) => void;
  onEdit: (t: Todo) => void;
  onDelete: (id: number) => void;
  onShare: (id: number) => void;
  onInvite: (id: number) => void;
  weekDays: any[];
}) {
  return (
    <div
      class={`group p-6 bg-white rounded-[2.5rem] border border-slate-100 transition-all flex flex-col gap-4 ${props.todo.isCompleted ? "bg-slate-50/50 opacity-50" : "hover:border-blue-200 shadow-sm hover:shadow-md"}`}
    >
      <div class="flex justify-between items-start">
        <div class="flex gap-5">
          <button
            onClick={() => props.onToggle(props.todo)}
            class={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${props.todo.isCompleted ? "bg-blue-600 border-blue-600 text-white" : "border-slate-200 hover:border-blue-400"}`}
          >
            <Show when={props.todo.isCompleted}>
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
              class={`text-xl font-bold leading-tight ${props.todo.isCompleted ? "line-through text-slate-300" : "text-slate-800"}`}
            >
              {props.todo.title}
            </h3>
            <Show when={props.todo.description}>
              <p class="text-slate-400 text-sm mt-1">
                {props.todo.description}
              </p>
            </Show>
          </div>
        </div>
        <div class="flex gap-1 md:opacity-0 group-hover:opacity-100 transition-all">
          <Show when={props.todo.ownerId === props.userId}>
            <button
              onClick={() => props.onInvite(props.todo.id)}
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
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </button>
          </Show>
            <button
              onClick={() => props.onShare(props.todo.id)}
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
              onClick={() => props.onEdit(props.todo)}
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
              onClick={() => props.onDelete(props.todo.id)}
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
        <Show when={props.todo.remindAt}>
          <span class="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-tighter">
            ⏰{" "}
            {new Date(props.todo.remindAt!).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
            {!props.todo.isRepeatable &&
              ` (${new Date(props.todo.remindAt!).toLocaleDateString()})`}
          </span>
        </Show>
        <Show when={props.todo.isRepeatable && props.todo.repeatDays}>
          <span class="px-3 py-1 bg-orange-50 text-orange-600 rounded-lg text-[10px] font-black uppercase tracking-tighter">
            🔁{" "}
            {props.todo.repeatDays
              ?.split(",")
              .map((d) => props.weekDays.find((wd) => wd.id === +d)?.label)
              .join(" ")}
          </span>
        </Show>
        <Show when={props.todo.ownerId !== props.userId}>
          <span class="px-3 py-1 bg-slate-100 text-slate-400 rounded-lg text-[10px] font-black uppercase tracking-tighter">
            👤 From: {props.todo.owner?.fullName}
          </span>
        </Show>
      </div>
    </div>
  );
}
