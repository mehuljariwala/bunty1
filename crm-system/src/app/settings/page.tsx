import { User, Bell, Shield, Palette, Globe, CreditCard } from "lucide-react";

const sections = [
  {
    icon: User,
    title: "Profile",
    description: "Update your personal information and avatar",
  },
  {
    icon: Bell,
    title: "Notifications",
    description: "Configure email and push notification preferences",
  },
  {
    icon: Shield,
    title: "Security",
    description: "Manage password and two-factor authentication",
  },
  {
    icon: Palette,
    title: "Appearance",
    description: "Customize theme, colors, and display options",
  },
  {
    icon: Globe,
    title: "Language & Region",
    description: "Set your language, timezone, and date format",
  },
  {
    icon: CreditCard,
    title: "Billing",
    description: "Manage subscription plan and payment methods",
  },
];

export default function SettingsPage() {
  return (
    <div className="max-w-[700px] mx-auto space-y-6">
      <p className="text-[0.85rem] text-slate-warm-400">
        Manage your account and preferences
      </p>

      <div className="space-y-3">
        {sections.map(({ icon: Icon, title, description }) => (
          <div
            key={title}
            className="flex items-center gap-4 bg-white rounded-2xl px-6 py-5 card-shadow hover:card-shadow-hover transition-shadow duration-300 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-cream-100 flex items-center justify-center text-slate-warm-500 group-hover:bg-sage-50 group-hover:text-sage-500 transition-colors">
              <Icon className="w-5 h-5" strokeWidth={1.8} />
            </div>
            <div className="flex-1">
              <p className="text-[0.9rem] font-semibold text-slate-warm-800">
                {title}
              </p>
              <p className="text-[0.8rem] text-slate-warm-400 mt-0.5">
                {description}
              </p>
            </div>
            <svg
              className="w-4 h-4 text-slate-warm-300 group-hover:text-sage-400 group-hover:translate-x-0.5 transition-all"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
}
