import {
  Component,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AutoForm,
  type AutoFormHandle,
  type Field,
  unsafeField,
} from "@zeroman.yang/react-auto-components";

type Draft = Record<string, unknown>;

class Boundary extends Component<
  { children: ReactNode; label: string },
  { error: string }
> {
  state = { error: "" };
  static getDerivedStateFromError(error: unknown) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="panel danger" role="alert">
          <strong>{this.props.label} 捕获错误</strong>
          <pre className="log">{this.state.error}</pre>
          <button type="button" onClick={() => this.setState({ error: "" })}>
            清除并重试挂载
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function manyFields(count: number): Field<Draft>[] {
  return Array.from({ length: count }, (_, i) => ({
    name: `f${i}`,
    label: `Field ${i}`,
    required: i % 37 === 0,
    span: i % 11 === 0 ? 2 : 1,
    defaultValue: i % 5 === 0 ? `seed-${i}` : "",
  }));
}

export function FormStress() {
  const [mode, setMode] = useState<"many" | "cross" | "burst" | "bad">(
    "many",
  );
  const [fieldCount, setFieldCount] = useState(500);
  const [log, setLog] = useState("");
  const [bursting, setBursting] = useState(false);
  const formRef = useRef<AutoFormHandle<Draft>>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const fields = useMemo(() => {
    if (mode === "cross") {
      return [
        {
          name: "a",
          label: "A（依赖 B 非空）",
          rules: [
            (_v, values) =>
              values.b ? undefined : "A 要求 B 已填写（交叉依赖）",
          ],
        },
        {
          name: "b",
          label: "B（依赖 A 非空）",
          rules: [
            (_v, values) =>
              values.a ? undefined : "B 要求 A 已填写（交叉依赖）",
          ],
        },
        {
          name: "c",
          label: "C",
          rules: [
            (value) =>
              String(value ?? "").length > 2000
                ? "C 超过 2000 字符"
                : undefined,
          ],
        },
      ] satisfies Field<Draft>[];
    }
    if (mode === "bad") {
      // Duplicate names intentionally — should throw RAC-FIELD-DUPLICATE.
      return [
        { name: "dup", label: "First" },
        unsafeField({ name: "dup", label: "Second duplicate" }),
      ] as Field<Draft>[];
    }
    return manyFields(fieldCount);
  }, [mode, fieldCount]);

  const clearBurst = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };
  // Leaving the route mid-burst must not keep writing into an unmounted form.
  useEffect(() => clearBurst, []);

  const stopBurst = () => {
    clearBurst();
    setBursting(false);
  };

  const startBurst = () => {
    if (bursting) {
      stopBurst();
      return;
    }
    setMode("burst");
    setBursting(true);
    let n = 0;
    timer.current = setInterval(() => {
      n += 1;
      formRef.current?.setValue("f0", `burst-${n}-${Date.now()}`);
      if (n % 20 === 0) formRef.current?.setValue("f1", `tick-${n}`);
      if (n >= 200) stopBurst();
    }, 16);
  };

  return (
    <div>
      <header className="page-head">
        <h1>AutoForm 极限</h1>
        <p>
          验证超长 schema、字段交叉校验死锁式依赖、连打 setValue、以及重复
          name 挂载失败是否被明确抛出。
        </p>
      </header>
      <div className="toolbar">
        <button
          type="button"
          className={mode === "many" ? "primary" : undefined}
          onClick={() => {
            stopBurst();
            setMode("many");
          }}
        >
          大量字段
        </button>
        <button
          type="button"
          className={mode === "cross" ? "primary" : undefined}
          onClick={() => {
            stopBurst();
            setMode("cross");
          }}
        >
          交叉校验
        </button>
        <button type="button" onClick={startBurst}>
          {bursting ? "停止连打" : "超快连打 setValue"}
        </button>
        <button
          type="button"
          className={mode === "bad" ? "primary" : undefined}
          onClick={() => {
            stopBurst();
            setMode("bad");
          }}
        >
          非法重复 name
        </button>
        {mode === "many" && (
          <label>
            字段数{" "}
            <select
              value={fieldCount}
              onChange={(e) => setFieldCount(Number(e.target.value))}
            >
              {[200, 500, 1000, 2000].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        )}
        <span className="metric">当前 {fields.length} 项</span>
      </div>
      <Boundary key={`${mode}-${fieldCount}`} label="AutoForm">
        <div className="panel" style={{ maxHeight: 640, overflow: "auto" }}>
          <AutoForm<Draft>
            ref={formRef}
            key={`${mode}-${fieldCount}`}
            fields={fields}
            columns={mode === "many" || mode === "burst" ? 4 : 2}
            onChange={(value) => {
              if (mode === "burst") {
                setLog(`keys=${Object.keys(value).length} f0=${String(value.f0 ?? "")}`);
              }
            }}
            onSubmit={async (value) => {
              setLog(`submit ok · keys=${Object.keys(value).length}`);
            }}
          />
        </div>
      </Boundary>
      {log && <pre className="log">{log}</pre>}
      <p className="note">
        交叉校验：只填一侧时提交应拦住；两侧都填才能通过。非法 schema
        预期挂载抛 <code>RAC-FIELD-DUPLICATE</code>，由错误边界展示。
      </p>
    </div>
  );
}
