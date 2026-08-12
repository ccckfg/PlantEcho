import { NavLink } from "react-router-dom";
import { PlantReflectionCard } from "./plants/PlantReflectionCard";
import { Icon } from "./UI";
import { useProactiveUnreadCount } from "@/features/proactive/useProactiveUnread";

const NAV_ITEMS = [
  { to: "/", label: "温室", icon: "potted_plant" },
  { to: "/chat", label: "植响对话", icon: "forum" },
  { to: "/journal", label: "成长日记", icon: "menu_book" },
  { to: "/album", label: "相册", icon: "photo_library" }
] as const;

export function SideNav() {
  const proactiveUnreadCount = useProactiveUnreadCount();
  return (
    <nav className="hidden md:flex flex-col h-screen w-64 shrink-0 bg-surface-container-low/70 backdrop-blur-sm border-r border-surface-container-highest/60 py-lg px-md z-10 sticky top-0">
      <PlantReflectionCard />
      <ul className="mt-md flex flex-col gap-xs flex-1 min-h-0 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                [
                  "group relative flex items-center gap-md px-md py-sm rounded-full",
                  "font-label-md text-label-md",
                  "transition-all duration-300 ease-emphasized",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                  isActive
                    ? "text-primary font-bold bg-secondary-container/60"
                    : "text-on-surface-variant hover:text-primary hover:bg-secondary-container/30"
                ].join(" ")
              }
            >
              {({ isActive }) => (
                <>
                  {/* 左侧 active 指示条 — 比整段背景更克制、更优雅 */}
                  <span
                    aria-hidden
                    className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full bg-primary transition-all duration-300 ease-emphasized ${
                      isActive ? "h-5 opacity-100" : "h-0 opacity-0"
                    }`}
                  />
                  <Icon
                    name={item.icon}
                    filled={isActive}
                    className={`text-[22px] transition-transform duration-300 ease-emphasized ${
                      isActive ? "scale-110" : "group-hover:scale-105 group-hover:-rotate-3"
                    }`}
                  />
                  <span className="transition-transform duration-300 ease-emphasized group-hover:translate-x-0.5">
                    {item.label}
                  </span>
                  {item.to === "/chat" && proactiveUnreadCount > 0 ? (
                    <span
                      className="ml-auto min-w-5 rounded-full bg-[#678b45] px-1.5 py-0.5 text-center text-[10px] font-bold leading-none text-white"
                      aria-label={`${proactiveUnreadCount} 株植物有新消息`}
                    >
                      {proactiveUnreadCount > 9 ? "9+" : proactiveUnreadCount}
                    </span>
                  ) : null}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
