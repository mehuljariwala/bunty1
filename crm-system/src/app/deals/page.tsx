import { Plus, ArrowUpRight } from "lucide-react";

const stages = [
  {
    name: "Qualified",
    color: "bg-sky-400",
    deals: [
      { title: "Acme Corp — Enterprise Plan", value: "$24,000", contact: "Sarah Miller", days: 5 },
      { title: "Nova — Premium License", value: "$8,500", contact: "James Wright", days: 2 },
    ],
  },
  {
    name: "Proposal",
    color: "bg-sage-400",
    deals: [
      { title: "BlueSky — Annual Contract", value: "$36,000", contact: "Tom Chen", days: 8 },
      { title: "Peak — Team Plan", value: "$12,200", contact: "Emma Wilson", days: 3 },
      { title: "Bright — Starter Pack", value: "$4,800", contact: "Maria Garcia", days: 1 },
    ],
  },
  {
    name: "Negotiation",
    color: "bg-coral-400",
    deals: [
      { title: "Atlas — Custom Solution", value: "$52,000", contact: "David Kim", days: 12 },
    ],
  },
  {
    name: "Closed Won",
    color: "bg-sage-500",
    deals: [
      { title: "Vertex — Full Suite", value: "$18,600", contact: "Lisa Park", days: 0 },
    ],
  },
];

export default function DealsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-[0.85rem] text-slate-warm-400">
          Pipeline value: <span className="font-semibold text-slate-warm-700">$156,100</span>
        </p>
        <button className="flex items-center gap-2 h-9 px-4 rounded-xl bg-sage-500 text-white text-[0.82rem] font-medium hover:bg-sage-600 transition-colors shadow-sm">
          <Plus className="w-4 h-4" strokeWidth={2.2} />
          New Deal
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stages.map((stage) => (
          <div key={stage.name} className="space-y-3">
            <div className="flex items-center gap-2.5 px-1">
              <div className={`w-2 h-2 rounded-full ${stage.color}`} />
              <h3 className="text-[0.82rem] font-semibold text-slate-warm-700">
                {stage.name}
              </h3>
              <span className="ml-auto text-[0.72rem] font-medium text-slate-warm-400 bg-slate-warm-50 px-2 py-0.5 rounded-full">
                {stage.deals.length}
              </span>
            </div>

            <div className="space-y-2.5">
              {stage.deals.map((deal, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl p-4 card-shadow hover:card-shadow-hover transition-shadow duration-300 cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-2.5">
                    <p className="text-[0.84rem] font-medium text-slate-warm-800 leading-snug pr-2">
                      {deal.title}
                    </p>
                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-warm-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
                  </div>
                  <p className="text-[1.1rem] font-semibold text-slate-warm-900 mb-2">
                    {deal.value}
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="text-[0.74rem] text-slate-warm-400">
                      {deal.contact}
                    </p>
                    {deal.days > 0 && (
                      <span className="text-[0.68rem] text-slate-warm-300">
                        {deal.days}d
                      </span>
                    )}
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
