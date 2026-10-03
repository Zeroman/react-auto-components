import { useEffect, useRef, useState } from "react";
import { AutoForm, type Field } from "@zeroman.yang/react-auto-components";
import { useDemoText } from "../../i18n";
import { MockDemo, mockRequest, type MockScenario } from "./MockDemo";

type Profile = { name: string; email: string; role?: string };
type Response = {
  fields: Field<Profile>[];
  initialValues: Profile;
  permissions: { edit: boolean };
  columns: number;
};

function load(scenario: MockScenario, signal: AbortSignal): Promise<Response> {
  const edit = scenario !== "restricted";
  const fields: Field<Profile>[] = [
    { name: "name", type: "input", label: "mock.form.name", required: true },
    { name: "email", type: "email", label: "mock.form.email", required: true },
  ];
  if (edit)
    fields.push({
      name: "role",
      type: "select",
      label: "mock.form.role",
      options: [
        { value: "member", label: "mock.form.member" },
        { value: "admin", label: "mock.form.admin" },
      ],
    });
  return mockRequest(
    {
      fields: scenario === "empty" ? [] : fields,
      initialValues: {
        name: "Casey Chen",
        email: "casey@example.com",
        ...(edit ? { role: "member" } : {}),
      },
      permissions: { edit },
      columns: edit ? 2 : 1,
    },
    { signal },
  );
}

function ProfileForm({ data }: { data: Response }) {
  const tr = useDemoText();
  const [value, setValue] = useState(data.initialValues);
  const [saved, setSaved] = useState<Profile | null>(null);
  const [failNext, setFailNext] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  const fields = data.fields.map((field) => ({
    ...field,
    label: tr(field.label ?? ""),
    ...("type" in field &&
    field.type === "select" &&
    Array.isArray(field.options)
      ? {
          options: field.options.map((option) => ({
            ...option,
            label: tr(option.label),
          })),
        }
      : {}),
  })) as Field<Profile>[];
  async function save(draft: Profile) {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const fail = failNext;
    setFailNext(false);
    setSaved(null);
    try {
      const result = await mockRequest(
        {
          ...draft,
          name: draft.name.trim(),
          email: draft.email.trim().toLowerCase(),
        },
        { signal: controller.signal, delay: 700, fail },
      );
      if (controller.signal.aborted) return;
      setValue(result);
      setSaved(result);
    } catch {
      if (!controller.signal.aborted) throw new Error(tr("mock.form.failed"));
    }
  }
  if (!fields.length) return <p role="status">{tr("mock.form.empty")}</p>;
  return (
    <>
      <p className="auto-badge">
        {tr(
          data.permissions.edit ? "mock.form.editable" : "mock.form.readOnly",
        )}
      </p>
      {data.permissions.edit && (
        <label>
          <input
            type="checkbox"
            checked={failNext}
            onChange={(event) => setFailNext(event.target.checked)}
          />{" "}
          {tr("mock.form.fail")}
        </label>
      )}
      <AutoForm
        fields={fields}
        value={value}
        defaultValue={data.initialValues}
        onChange={setValue}
        readOnly={!data.permissions.edit}
        columns={data.columns}
        onSubmit={save}
        submitLabel={tr("mock.form.save")}
      />
      {saved && (
        <div role="status" data-testid="mock-form-saved">
          <strong>{tr("mock.form.saved")}</strong>
          <pre>{JSON.stringify(saved, null, 2)}</pre>
        </div>
      )}
    </>
  );
}

export function ServerFormDemo() {
  return (
    <MockDemo
      title="mock.form.title"
      description="mock.form.description"
      load={load}
    >
      {({ data }) => <ProfileForm data={data} />}
    </MockDemo>
  );
}
