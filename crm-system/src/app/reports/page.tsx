import { TrendingUp, Users, Handshake, DollarSign } from "lucide-react";

const metrics = [
  { label: "New Leads", value: "342", prev: "298", icon: Users },
  { label: "Deals Closed", value: "48", prev: "41", icon: Handshake },
  { label: "Revenue", value: "$148.2K", prev: "$124.8K", icon: DollarSign },
  { label: "Growth Rate", value: "18.7%", prev: "14.2%", icon: TrendingUp },
];

const monthlyData = [
  { month: "Sep", value: 62 },
  { month: "Oct", value: 78 },
  { month: "Nov", value: 55 },
  { month: "Dec", value: 91 },
  { month: "Jan", value: 84 },
  { month: "Feb", value: 100 },
];

const topPerformers = [
  { name: "Jane Doe", deals: 14, revenue: "$42,800" },
  { name: "Tom Chen", deals: 11, revenue: "$36,200" },
  { name: "Sarah Miller", deals: 9, revenue: "$28,500" },
  { name: "David Kim", deals: 8, revenue: "$24,100" },
];

export default function ReportsPage() {
  const maxVal = Math.max(...monthlyData.map((d) => d.value));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-[0.85rem] text-slate-warm-400">
          Overview for February 2026
        </p>
        <select className="h-9 px-3 pr-8 rounded-xl bg-white border border-slate-warm-100 text-[0.82rem] text-slate-warm-600 focus:outline-none focus:ring-2 focus:ring-sage-200 appearance-none cursor-pointer">
          <option>This Month</option>
          <option>Last Month</option>
          <option>This Quarter</option>
        </select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map(({ label, value, prev, icon: Icon }) => (
          <div key={label} className="bg-white rounded-2xl p-5 card-shadow">
            <Icon className="w-5 h-5 text-sage-400 mb-3" strokeWidth={1.8} />
            <p className="text-[1.6rem] font-semibold tracking-tight text-slate-warm-900 leading-none mb-1">
              {value}
            </p>
            <p className="text-[0.76rem] text-slate-warm-400">
              {label} <span className="text-slate-warm-300">vs {prev}</span>
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 card-shadow">
          <h3 className="text-[0.95rem] font-semibold text-slate-warm-800 mb-6">
            Deals Trend
          </h3>
          <div className="flex items-end gap-3 h-48">
            {monthlyData.map((d) => (
              <div key={d.month} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-[0.68rem] font-medium text-slate-warm-500">
                  {d.value}
                </span>
                <div
                  className="w-full rounded-t-lg bg-sage-400/80 hover:bg-sage-500 transition-colors cursor-pointer"
                  style={{ height: `${(d.value / maxVal) * 100}%` }}
                />
                <span className="text-[0.72rem] text-slate-warm-400">
                  {d.month}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl card-shadow overflow-hidden">
          <div className="px-6 pt-5 pb-3">
            <h3 className="text-[0.95rem] font-semibold text-slate-warm-800">
              Top Performers
            </h3>
          </div>
          <div className="divide-y divide-slate-warm-50">
            {topPerformers.map((person, i) => (
              <div key={i} className="flex items-center gap-3 px-6 py-3.5">
                <span className="w-6 h-6 rounded-full bg-sage-100 flex items-center justify-center text-[0.65rem] font-bold text-sage-700">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[0.84rem] font-medium text-slate-warm-800 truncate">
                    {person.name}
                  </p>
                  <p className="text-[0.72rem] text-slate-warm-400">
                    {person.deals} deals
                  </p>
                </div>
                <span className="text-[0.82rem] font-semibold text-sage-600">
                  {person.revenue}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
