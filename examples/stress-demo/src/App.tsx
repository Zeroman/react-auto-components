import { useEffect, useMemo, useState } from "react";
import { FormStress } from "./pages/FormStress";
import { TableStress } from "./pages/TableStress";
import { ChatStress } from "./pages/ChatStress";
import { DialogStress } from "./pages/DialogStress";
import { MenuStress } from "./pages/MenuStress";
import { TabsStress } from "./pages/TabsStress";
import { FocusStress } from "./pages/FocusStress";
import { SearchStress } from "./pages/SearchStress";
import { Home } from "./pages/Home";

export type RouteId =
  | "home"
  | "form"
  | "table"
  | "chat"
  | "dialog"
  | "menu"
  | "tabs"
  | "focus"
  | "search";

const ROUTES: { id: RouteId; label: string; verify: string }[] = [
  {
    id: "home",
    label: "总览",
    verify: "入口导航与场景说明",
  },
  {
    id: "form",
    label: "AutoForm",
    verify: "超多字段 / 交叉校验 / 非法 schema / 连打",
  },
  {
    id: "table",
    label: "AutoTable",
    verify: "10 万行 / 空表 / 超宽列 / 动态列 / 超长单元格",
  },
  {
    id: "chat",
    label: "AutoChat",
    verify: "海量消息 / 超长消息 / 中断重试 / 并发发送",
  },
  {
    id: "dialog",
    label: "AutoDialog",
    verify: "多层叠开 / 快速开关 / 关闭拦截",
  },
  {
    id: "menu",
    label: "AutoMenu",
    verify: "深嵌套 / 快速折叠 / 极小容器",
  },
  {
    id: "tabs",
    label: "AutoTabs",
    verify: "大量标签 / 嵌套 / 快速切换",
  },
  {
    id: "focus",
    label: "AutoFocus",
    verify: "竞争注册 / 显隐切换 / 极小视口",
  },
  {
    id: "search",
    label: "AutoSearch",
    verify: "多字段即时搜索 / 连打 / 极小宽度",
  },
];

function parseHash(): RouteId {
  const raw = location.hash.replace(/^#\/?/, "") || "home";
  return (ROUTES.some((r) => r.id === raw) ? raw : "home") as RouteId;
}

export function App() {
  const [route, setRoute] = useState<RouteId>(parseHash);
  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const go = (id: RouteId) => {
    location.hash = id === "home" ? "" : `#/${id}`;
  };
  const page = useMemo(() => {
    switch (route) {
      case "form":
        return <FormStress />;
      case "table":
        return <TableStress />;
      case "chat":
        return <ChatStress />;
      case "dialog":
        return <DialogStress />;
      case "menu":
        return <MenuStress />;
      case "tabs":
        return <TabsStress />;
      case "focus":
        return <FocusStress />;
      case "search":
        return <SearchStress />;
      default:
        return <Home routes={ROUTES.filter((r) => r.id !== "home")} onOpen={go} />;
    }
  }, [route]);

  return (
    <div className="app-shell">
      <aside className="app-nav">
        <p className="brand">RAC Stress Demo</p>
        <p className="brand-sub">极限场景集合 · 暴露组件边界</p>
        <ul className="nav-list">
          {ROUTES.map((item) => (
            <li key={item.id}>
              <a
                href={item.id === "home" ? "#/" : `#/${item.id}`}
                aria-current={route === item.id ? "page" : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  go(item.id);
                }}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </aside>
      <main className="app-main">{page}</main>
    </div>
  );
}

export type HomeRoute = (typeof ROUTES)[number];
