"use client";

import { Plus, Calendar, Flag } from "lucide-react";

const taskGroups = [
  {
    label: "Today",
    tasks: [
      { title: "Call with Acme Corp", due: "2:00 PM", priority: "high", done: false },
      { title: "Send proposal to BlueSky", due: "4:30 PM", priority: "medium", done: false },
      { title: "Update contact info for Nova", due: "5:00 PM", priority: "low", done: true },
    ],
  },
  {
    label: "Tomorrow",
    tasks: [
      { title: "Review Q1 pipeline report", due: "10:00 AM", priority: "high", done: false },
      { title: "Team sync meeting", due: "2:00 PM", priority: "medium", done: false },
      { title: "Follow up with Maria Garcia", due: "3:30 PM", priority: "low", done: false },
    ],
  },
  {
    label: "This Week",
    tasks: [
      { title: "Prepare quarterly presentation", due: "Wed", priority: "high", done: false },
      { title: "Onboard new lead — Peak Strategy", due: "Thu", priority: "medium", done: false },
      { title: "Clean up inactive contacts", due: "Fri", priority: "low", done: false },
    ],
  },
];

const priorityColor: Record<string, string> = {
  high: "text-coral-500",
  medium: "text-sky-500",
  low: "text-slate-warm-300",
};

export default function TasksPage() {
  return (
    <div className="max-w-[800px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-[0.85rem] text-slate-warm-400">
          9 tasks remaining
        </p>
        <button className="flex items-center gap-2 h-9 px-4 rounded-xl bg-sage-500 text-white text-[0.82rem] font-medium hover:bg-sage-600 transition-colors shadow-sm">
          <Plus className="w-4 h-4" strokeWidth={2.2} />
          Add Task
        </button>
      </div>

      <div className="space-y-8">
        {taskGroups.map((group) => (
          <div key={group.label}>
            <h3 className="text-[0.78rem] font-semibold uppercase tracking-wider text-slate-warm-400 mb-3 px-1">
              {group.label}
            </h3>
            <div className="space-y-2">
              {group.tasks.map((task, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-4 bg-white rounded-xl px-5 py-3.5 card-shadow hover:card-shadow-hover transition-all duration-200 cursor-pointer ${
                    task.done ? "opacity-50" : ""
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-md border-2 shrink-0 flex items-center justify-center transition-colors ${
                      task.done
                        ? "bg-sage-500 border-sage-500"
                        : "border-slate-warm-200 hover:border-sage-400"
                    }`}
                  >
                    {task.done && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path
                          d="M1 4L3.5 6.5L9 1"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-[0.88rem] font-medium ${
                        task.done
                          ? "line-through text-slate-warm-400"
                          : "text-slate-warm-800"
                      }`}
                    >
                      {task.title}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-1.5 text-[0.74rem] text-slate-warm-400">
                      <Calendar className="w-3.5 h-3.5" strokeWidth={1.8} />
                      {task.due}
                    </div>
                    <Flag
                      className={`w-3.5 h-3.5 ${priorityColor[task.priority]}`}
                      strokeWidth={1.8}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
