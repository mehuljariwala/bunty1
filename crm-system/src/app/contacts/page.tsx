import { Search, Filter, Plus, Mail, Phone, MoreHorizontal } from "lucide-react";

const contacts = [
  { name: "Sarah Miller", email: "sarah@acmecorp.com", phone: "+1 (555) 234-5678", company: "Acme Corp", status: "Active", avatar: "SM" },
  { name: "Tom Chen", email: "tom@bluesky.io", phone: "+1 (555) 345-6789", company: "BlueSky Inc", status: "Active", avatar: "TC" },
  { name: "Lisa Park", email: "lisa@vertex.dev", phone: "+1 (555) 456-7890", company: "Vertex Labs", status: "Inactive", avatar: "LP" },
  { name: "James Wright", email: "james@nova.co", phone: "+1 (555) 567-8901", company: "Nova Systems", status: "Active", avatar: "JW" },
  { name: "Maria Garcia", email: "maria@bright.com", phone: "+1 (555) 678-9012", company: "Bright Media", status: "Lead", avatar: "MG" },
  { name: "David Kim", email: "david@atlas.io", phone: "+1 (555) 789-0123", company: "Atlas Digital", status: "Active", avatar: "DK" },
  { name: "Emma Wilson", email: "emma@peak.co", phone: "+1 (555) 890-1234", company: "Peak Strategy", status: "Lead", avatar: "EW" },
];

const statusStyles: Record<string, string> = {
  Active: "bg-sage-50 text-sage-600",
  Inactive: "bg-slate-warm-100 text-slate-warm-500",
  Lead: "bg-sky-400/10 text-sky-500",
};

export default function ContactsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[0.85rem] text-slate-warm-400">
            {contacts.length} contacts total
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-warm-400" strokeWidth={1.8} />
            <input
              type="text"
              placeholder="Search contacts..."
              className="w-56 h-9 pl-9 pr-4 rounded-xl bg-white border border-slate-warm-100 text-[0.85rem] text-slate-warm-700 placeholder:text-slate-warm-300 focus:outline-none focus:ring-2 focus:ring-sage-200 focus:border-sage-300 transition-all"
            />
          </div>
          <button className="flex items-center gap-2 h-9 px-3 rounded-xl bg-white border border-slate-warm-100 text-[0.82rem] font-medium text-slate-warm-600 hover:bg-cream-50 transition-colors">
            <Filter className="w-3.5 h-3.5" strokeWidth={1.8} />
            Filter
          </button>
          <button className="flex items-center gap-2 h-9 px-4 rounded-xl bg-sage-500 text-white text-[0.82rem] font-medium hover:bg-sage-600 transition-colors shadow-sm">
            <Plus className="w-4 h-4" strokeWidth={2.2} />
            Add Contact
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl card-shadow overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-warm-100">
              <th className="text-left px-6 py-3.5 text-[0.72rem] font-semibold uppercase tracking-wider text-slate-warm-400">Name</th>
              <th className="text-left px-6 py-3.5 text-[0.72rem] font-semibold uppercase tracking-wider text-slate-warm-400">Company</th>
              <th className="text-left px-6 py-3.5 text-[0.72rem] font-semibold uppercase tracking-wider text-slate-warm-400">Contact</th>
              <th className="text-left px-6 py-3.5 text-[0.72rem] font-semibold uppercase tracking-wider text-slate-warm-400">Status</th>
              <th className="w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-warm-50">
            {contacts.map((contact, i) => (
              <tr
                key={i}
                className="hover:bg-cream-50 transition-colors cursor-pointer"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-sage-100 flex items-center justify-center text-[0.72rem] font-semibold text-sage-700 shrink-0">
                      {contact.avatar}
                    </div>
                    <div>
                      <p className="text-[0.84rem] font-medium text-slate-warm-800">
                        {contact.name}
                      </p>
                      <p className="text-[0.74rem] text-slate-warm-400">
                        {contact.email}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-[0.84rem] text-slate-warm-600">
                  {contact.company}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button className="p-1.5 rounded-lg hover:bg-sage-50 transition-colors text-slate-warm-400 hover:text-sage-500">
                      <Mail className="w-3.5 h-3.5" strokeWidth={1.8} />
                    </button>
                    <button className="p-1.5 rounded-lg hover:bg-sage-50 transition-colors text-slate-warm-400 hover:text-sage-500">
                      <Phone className="w-3.5 h-3.5" strokeWidth={1.8} />
                    </button>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`text-[0.72rem] font-medium px-2.5 py-1 rounded-full ${statusStyles[contact.status]}`}
                  >
                    {contact.status}
                  </span>
                </td>
                <td className="px-3 py-4">
                  <button className="p-1.5 rounded-lg hover:bg-cream-100 transition-colors text-slate-warm-300">
                    <MoreHorizontal className="w-4 h-4" strokeWidth={1.8} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
