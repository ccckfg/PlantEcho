import { NavLink } from "react-router-dom";
import { Icon } from "@/components/UI";

/** 与桌面 SideNav 一致的导航项，保证两端信息架构对齐。 */
const NAV_ITEMS = [
  { to: "/", label: "温室", icon: "potted_plant" },
  { to: "/chat", label: "对话", icon: "forum" },
  { to: "/journal", label: "日记", icon: "menu_book" },
  { to: "/album", label: "相册", icon: "photo_library" }
] as const;

/**
 * 底部 Tab 栏 —— 移动端主导航，替代桌面侧栏。
 * 作为 MobileShell flex 列的最后一项就地排布（shrink-0），
 * 因此始终贴底可见，且不会遮挡可滚动主区域；底部安全区抬高避开手势条。
 */
export function MobileTabBar() {
  return (
    <nav
      className="relative z-40 shrink-0 border-t border-surface-container-highest/60 bg-surface-container-lowest/95 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="主导航"
    >
      {/* 底部边缘空气感渐变条：贴合底栏顶边向上延伸，消除滚动内容在底部的硬着陆感 */}
      <div className="pointer-events-none absolute inset-x-0 -top-6 z-10 h-6 bg-gradient-to-t from-surface-container-lowest/95 via-surface-container-lowest/40 to-transparent" />
      <ul className="mx-auto flex max-w-xl items-stretch justify-around px-xs">
        {NAV_ITEMS.map((item) => (
          <li key={item.to} className="flex-1">
            <NavLink
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                [
                  "group flex h-[58px] flex-col items-center justify-center gap-0.5 rounded-md",
                  "font-label-sm text-label-sm transition-colors duration-300 ease-emphasized",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                  isActive ? "text-primary" : "text-on-surface-variant"
                ].join(" ")
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`grid place-items-center rounded-full px-lg py-0.5 transition-all duration-300 ease-emphasized ${
                      isActive ? "bg-secondary-container/60" : "bg-transparent group-active:bg-secondary-container/30"
                    }`}
                  >
                    <Icon
                      name={item.icon}
                      filled={isActive}
                      className={`text-[22px] transition-transform duration-300 ease-emphasized ${
                        isActive ? "scale-105" : "group-active:scale-95"
                      }`}
                    />
                  </span>
                  <span className={isActive ? "font-bold" : ""}>{item.label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
