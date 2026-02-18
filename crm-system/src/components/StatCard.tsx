import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  change: string;
  positive: boolean;
  icon: LucideIcon;
  accent: string;
}

export default function StatCard({
  label,
  value,
  change,
  positive,
  icon: Icon,
  accent,
}: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl p-5 card-shadow hover:card-shadow-hover transition-shadow duration-300 border border-slate-200 group">
      <div className="flex items-start justify-between mb-4">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent}`}
        >
          <Icon className="w-5 h-5" strokeWidth={1.8} />
        </div>
        <span
          className={`text-[0.75rem] font-medium px-2 py-0.5 rounded-full ${
            positive
              ? "bg-blue-50 text-blue-600"
              : "bg-red-50 text-red-500"
          }`}
        >
          {change}
        </span>
      </div>
      <p className="text-[2rem] font-semibold tracking-tight text-slate-900 leading-none mb-1">
        {value}
      </p>
      <p className="text-[0.8rem] text-slate-400 font-medium">{label}</p>
    </div>
  );
}
