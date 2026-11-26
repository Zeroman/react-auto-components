import type { HomeRoute, RouteId } from "../App";

export function Home({
  routes,
  onOpen,
}: {
  routes: HomeRoute[];
  onOpen: (id: RouteId) => void;
}) {
  return (
    <div>
      <header className="page-head">
        <h1>极限测试 Demo 集合</h1>
        <p>
          独立于 test-project 的压力场景应用。通过 workspace 依赖本仓库
          <code> @zeroman.yang/react-auto-components </code>
          。每个页面验证一项或多项边界行为，页面底部说明写明了预期表现。
        </p>
      </header>
      <div className="scenario-grid">
        {routes.map((route) => (
          <a
            key={route.id}
            className="scenario-card"
            href={`#/${route.id}`}
            onClick={(e) => {
              e.preventDefault();
              onOpen(route.id);
            }}
          >
            <strong>{route.label}</strong>
            <span>{route.verify}</span>
          </a>
        ))}
      </div>
      <p className="note">
        启动：在仓库根执行 <code>pnpm install</code> 后，
        <code>pnpm --dir examples/stress-demo dev</code>（端口 4174）。
        验证时打开浏览器控制台，关注未预期报错与明显卡死。
      </p>
    </div>
  );
}
