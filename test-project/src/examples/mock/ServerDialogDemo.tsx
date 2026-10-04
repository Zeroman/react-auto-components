import { useEffect, useRef, useState } from "react";
import {
  AutoDialog,
  AutoForm,
  type Field,
} from "@zeroman.yang/react-auto-components";
import { useDemoText } from "../../i18n";
import { MockDemo, mockRequest, type MockScenario } from "./MockDemo";

type RecordValue = { name: string; email: string };
type DialogConfig = {
  recordId: string | null;
  title: string;
  width: number;
  permissions: { edit: boolean };
  fields: Field<RecordValue>[];
};
function load(
  scenario: MockScenario,
  signal: AbortSignal,
): Promise<DialogConfig> {
  return mockRequest(
    {
      recordId: scenario === "empty" ? null : "profile-42",
      title: "mock.dialog.heading",
      width: scenario === "restricted" ? 440 : 600,
      permissions: { edit: scenario !== "restricted" },
      fields: [
        {
          name: "name",
          type: "input",
          label: "mock.form.name",
          required: true,
        },
        {
          name: "email",
          type: "email",
          label: "mock.form.email",
          required: true,
        },
      ],
    },
    { signal },
  );
}

function RecordDialog({ data }: { data: DialogConfig }) {
  const tr = useDemoText();
  // This is the in-browser server record, separate from the draft in AutoForm.
  const [record, setRecord] = useState<RecordValue>({
    name: "Jordan Lee",
    email: "jordan@example.com",
  });
  const [loaded, setLoaded] = useState<RecordValue | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failNext, setFailNext] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  function close() {
    request.current?.abort();
    setOpen(false);
    setSaving(false);
    setLoaded(null);
  }
  async function openRecord() {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoaded(null);
    setFailNext(false);
    setOpen(true);
    try {
      const response = await mockRequest(record, {
        signal: controller.signal,
        delay: 550,
      });
      if (!controller.signal.aborted) setLoaded(response);
    } catch (error) {
      if (!controller.signal.aborted) throw error;
    }
  }
  async function save(draft: RecordValue) {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setSaving(true);
    const fail = failNext;
    setFailNext(false);
    try {
      const response = await mockRequest(
        { name: draft.name.trim(), email: draft.email.trim().toLowerCase() },
        { signal: controller.signal, delay: 750, fail },
      );
      if (controller.signal.aborted) return;
      setRecord(response);
      close();
    } catch {
      if (!controller.signal.aborted) throw new Error(tr("mock.form.failed"));
    } finally {
      if (!controller.signal.aborted) setSaving(false);
    }
  }
  const fields = data.fields.map((field) =>
    "label" in field && typeof field.label === "string"
      ? { ...field, label: tr(field.label) }
      : field,
  );
  if (!data.recordId) return <p role="status">{tr("mock.dialog.empty")}</p>;
  return (
    <>
      <div data-testid="mock-dialog-summary">
        <strong>{tr("mock.dialog.summary")}</strong>
        <p>
          {record.name} · {record.email}
        </p>
      </div>
      <button type="button" onClick={() => void openRecord()}>
        {tr("mock.dialog.open")}
      </button>
      <AutoDialog
        open={open}
        onOpenChange={(next) => {
          if (!next) close();
        }}
        title={tr(data.title)}
        description={tr("mock.dialog.description")}
        width={data.width}
        hideFooter
        content={
          <>
            {!loaded ? (
              <p role="status">{tr("mock.dialog.loading")}</p>
            ) : (
              <>
                <p className="auto-badge">
                  {tr(
                    data.permissions.edit
                      ? "mock.form.editable"
                      : "mock.form.readOnly",
                  )}
                </p>
                {data.permissions.edit && (
                  <label>
                    <input
                      type="checkbox"
                      checked={failNext}
                      disabled={saving}
                      onChange={(event) => setFailNext(event.target.checked)}
                    />{" "}
                    {tr("mock.form.fail")}
                  </label>
                )}
                <AutoForm
                  fields={fields}
                  defaultValue={loaded}
                  readOnly={!data.permissions.edit}
                  onSubmit={save}
                  submitLabel={tr("mock.dialog.save")}
                  columns={1}
                />
                <details>
                  <summary>{tr("mock.dialog.details")}</summary>
                  <pre>{JSON.stringify(loaded, null, 2)}</pre>
                </details>
              </>
            )}
            {saving && <p role="status">{tr("mock.form.saving")}</p>}
            <div className="auto-actions">
              <button type="button" onClick={close}>
                {tr("mock.dialog.cancel")}
              </button>
            </div>
          </>
        }
      />
    </>
  );
}

export function ServerDialogDemo() {
  return (
    <MockDemo
      title="mock.dialog.title"
      description="mock.dialog.description"
      load={load}
    >
      {({ data }) => <RecordDialog data={data} />}
    </MockDemo>
  );
}
