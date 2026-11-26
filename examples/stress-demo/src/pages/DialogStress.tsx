import { useEffect, useRef, useState } from "react";
import {
  AutoDialog,
  useAutoDialog,
  type Field,
} from "@zeroman.yang/react-auto-components";

type Draft = { name: string; note: string };

const fields: Field<Draft>[] = [
  { name: "name", label: "Name", required: true },
  { name: "note", label: "Note", span: 2 },
];

export function DialogStress() {
  const dialog = useAutoDialog();
  const [log, setLog] = useState("");
  const [open, setOpen] = useState(false);
  const [rapid, setRapid] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopRapid = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setRapid(false);
  };
  // Navigating away mid-toggle must not keep flipping an unmounted dialog.
  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
    },
    [],
  );

  const openNested = (depth: number) => {
    dialog.open({
      title: `层级 ${depth}`,
      width: Math.max(320, 560 - depth * 24),
      content: (
        <div>
          <p>嵌套深度 {depth}。继续打开会叠在上层。</p>
          <div className="toolbar">
            <button type="button" onClick={() => openNested(depth + 1)}>
              再开一层
            </button>
            <button
              type="button"
              onClick={() =>
                dialog.open({
                  title: "表单层",
                  fields,
                  defaultValue: { name: "", note: `d${depth}` },
                  onSubmit: async (v) =>
                    setLog(`nested form submit: ${v.name}`),
                })
              }
            >
              打开表单对话框
            </button>
          </div>
        </div>
      ),
    });
  };

  return (
    <div>
      <header className="page-head">
        <h1>AutoDialog 极限</h1>
        <p>多层命令式叠开、声明式快速开关、关闭拦截与表单提交失败保留草稿。</p>
      </header>
      <div className="toolbar">
        <button type="button" className="primary" onClick={() => openNested(1)}>
          多层叠开
        </button>
        <button
          type="button"
          onClick={() => {
            if (rapid) {
              stopRapid();
              setOpen(false);
              return;
            }
            setRapid(true);
            let n = 0;
            timer.current = setInterval(() => {
              n += 1;
              setOpen((v) => !v);
              if (n >= 40) {
                stopRapid();
                setOpen(false);
                setLog("rapid toggle finished (40 flips)");
              }
            }, 50);
          }}
        >
          {rapid ? "停止快速开关" : "声明式快速开关"}
        </button>
        <button
          type="button"
          onClick={() =>
            dialog.open({
              title: "关闭拦截",
              content: <p>只有点确定才能关；取消/关闭被 beforeClose 拦住。</p>,
              beforeClose: (reason) => reason === "submit",
              onClose: (reason) => setLog(`closed: ${reason}`),
            })
          }
        >
          关闭拦截
        </button>
        <button
          type="button"
          onClick={() =>
            dialog.open({
              title: "提交失败",
              fields,
              defaultValue: { name: "keep-me", note: "" },
              onSubmit: async () => {
                throw new Error("模拟保存失败：对话框应保持打开");
              },
            })
          }
        >
          提交失败保留
        </button>
      </div>
      <div className="panel">
        <p className="note" style={{ marginTop: 0 }}>
          声明式对话框状态：{open ? "open" : "closed"}
          {rapid ? " · 快速切换中" : ""}
        </p>
        <AutoDialog
          open={open}
          onOpenChange={setOpen}
          title="声明式对话框"
          content={<p>被快速开关时不应泄漏焦点或留下不可关遮罩。</p>}
        />
      </div>
      {log && <pre className="log">{log}</pre>}
    </div>
  );
}
