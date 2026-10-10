import { StrictMode, useRef, useState, type RefObject } from "react";
import { createRoot } from "react-dom/client";
import { AutoFocus, AutoTabs } from "@zeroman.yang/react-auto-components";

function Visibility() {
  const [hidden, setHidden] = useState(false);
  const [mounted, setMounted] = useState(true);
  const [ready, setReady] = useState(true);
  const [disabled, setDisabled] = useState(false);
  return (
    <>
      <style>{`.candidate[data-concealed="yes"] { display: none } @media (max-width: 600px) { .candidate { display: none } }`}</style>
      <button onClick={() => setHidden(!hidden)}>Toggle visibility</button>
      <button onClick={() => setMounted(!mounted)}>Toggle mount</button>
      <button onClick={() => setReady(!ready)}>Toggle target</button>
      <button onClick={() => setDisabled(!disabled)}>Toggle disabled</button>
      <AutoFocus>
        <div tabIndex={-1}>
          <input aria-label="Earlier" />
          <input aria-label="Manual" />
        </div>
      </AutoFocus>
      {mounted && (
        <section
          data-testid="candidate"
          className="candidate"
          data-concealed={hidden ? "yes" : "no"}
        >
          <fieldset disabled={disabled}>
            <AutoFocus>{ready && <input aria-label="Later" />}</AutoFocus>
          </fieldset>
        </section>
      )}
      <div style={{ display: "none" }}>
        <AutoFocus>
          <input aria-label="Always hidden" />
        </AutoFocus>
      </div>
    </>
  );
}

function Nested() {
  const [path, setPath] = useState<readonly string[]>(["a"]);
  return (
    <>
      <button onClick={() => setPath(["a"])}>Go A</button>
      <button onClick={() => setPath(["b"])}>Go B</button>
      <AutoTabs
        value={path}
        onChange={setPath}
        items={[
          {
            id: "a",
            label: "Outer A",
            children: [
              {
                id: "inner",
                label: "Inner editor",
                content: (
                  <AutoFocus>
                    <input aria-label="Entry" />
                    <input aria-label="Other" />
                  </AutoFocus>
                ),
              },
              {
                id: "next",
                label: "Inner next",
                content: (
                  <AutoFocus>
                    <input aria-label="Inner next entry" />
                  </AutoFocus>
                ),
              },
            ],
          },
          {
            id: "b",
            label: "Outer B",
            content: (
              <AutoFocus>
                <input aria-label="B entry" />
              </AutoFocus>
            ),
          },
        ]}
      />
    </>
  );
}

function Eligibility() {
  const [media, setMedia] = useState(false);
  const [offscreen, setOffscreen] = useState(false);
  return (
    <>
      <button onClick={() => setMedia(true)}>Enable media entry</button>
      <button onClick={() => setOffscreen(true)}>Enable offscreen entry</button>
      <AutoFocus target="[data-candidate]">
        <div
          dangerouslySetInnerHTML={{
            __html:
              '<details open><summary>Heading</summary><summary data-candidate>Not a focusable summary</summary></details><div data-candidate tabindex="invalid">Invalid tabindex</div><div data-candidate contenteditable="invalid">Invalid editor</div>',
          }}
        />
        <input data-candidate aria-label="Usable entry" />
      </AutoFocus>
      <AutoFocus disabled={!media}>
        <video controls data-testid="media-entry" />
      </AutoFocus>
      <section
        style={{
          marginTop: 10000,
          contentVisibility: "auto",
          containIntrinsicSize: "100px",
        }}
      >
        <AutoFocus disabled={!offscreen}>
          <input aria-label="Offscreen entry" />
        </AutoFocus>
      </section>
    </>
  );
}

function ExternalEditor({
  target,
}: {
  target: RefObject<HTMLAnchorElement | null>;
}) {
  const [visible, setVisible] = useState(true);
  return (
    <>
      <button onClick={() => setVisible(false)}>Remove external target</button>
      {visible && (
        <a href="#editor" ref={target}>
          External link
        </a>
      )}
    </>
  );
}

function External() {
  const target = useRef<HTMLAnchorElement>(null);
  return (
    <>
      <AutoFocus>
        <input aria-label="Fallback entry" />
      </AutoFocus>
      <ExternalEditor target={target} />
      <AutoFocus target={target} />
    </>
  );
}

export function mount(
  scenario: "visibility" | "nested" | "eligibility" | "external",
) {
  const host = document.createElement("div");
  document.body.append(host);
  document.querySelector<HTMLElement>("#root")!.hidden = true;
  createRoot(host).render(
    <StrictMode>
      {scenario === "visibility" ? (
        <Visibility />
      ) : scenario === "nested" ? (
        <Nested />
      ) : scenario === "eligibility" ? (
        <Eligibility />
      ) : (
        <External />
      )}
    </StrictMode>,
  );
}
