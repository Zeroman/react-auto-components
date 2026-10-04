import { useState, type ReactNode } from "react";
import {
  AutoChat,
  AutoForm,
  AutoMenu,
  AutoSearch,
  AutoTable,
  AutoTabs,
  useAutoConfig,
  useAutoDialog,
  type AutoColumn,
  type Field,
  type QueryNode,
} from "@zeroman.yang/react-auto-components";
import { useDemoText } from "../i18n";
import { demoUserHref, type DemoAccessStatus } from "./mock/access";

interface Task {
  id: number;
  name: string;
  owner: string;
  budget: number;
  audit: string;
}

interface Entry {
  name: string;
  owner: string;
  audit: string;
}

const initialRows: Task[] = [
  {
    id: 1,
    name: "Audit log export",
    owner: "admin",
    budget: 1200,
    audit: "kept",
  },
  {
    id: 2,
    name: "Public status page",
    owner: "guest",
    budget: 800,
    audit: "public",
  },
  {
    id: 3,
    name: "Billing reconciliation",
    owner: "admin",
    budget: 2400,
    audit: "open",
  },
];

function entryFields(tr: (key: string) => string): Field<Entry>[] {
  return [
    { name: "name", label: tr("permissions.name") },
    { name: "owner", label: tr("permissions.owner"), roles: ["admin"] },
    {
      name: "audit",
      label: tr("permissions.audit"),
      permissions: ["audit:read"],
    },
  ];
}

function TableExample({ admin }: { admin: boolean }) {
  const tr = useDemoText();
  const [rows, setRows] = useState<Task[]>(initialRows);
  const columns: AutoColumn<Task>[] = [
    { key: "name", label: tr("permissions.task"), sortable: true },
    { key: "owner", label: tr("permissions.owner") },
    {
      key: "budget",
      label: tr("permissions.budget"),
      type: "number",
      roles: ["admin"],
    },
    {
      key: "audit",
      label: tr("permissions.audit"),
      permissions: ["audit:read"],
    },
  ];
  const fields: Field<Task>[] = [
    { name: "name", label: tr("permissions.task"), required: true },
    { name: "owner", label: tr("permissions.owner"), required: true },
  ];
  return (
    <div className="card auto-root">
      <AutoTable<Task>
        id="permissions-tasks"
        rowKey="id"
        data={rows}
        columns={columns}
        formFields={fields}
        pageSize={5}
        height={280}
        onAdd={
          admin
            ? (values) =>
                setRows((old) => [
                  ...old,
                  { ...values, id: Date.now(), budget: 0, audit: "" },
                ])
            : undefined
        }
        onEdit={
          admin
            ? (row, values) =>
                setRows((old) =>
                  old.map((item) =>
                    item.id === row.id ? { ...row, ...values } : item,
                  ),
                )
            : undefined
        }
        onDelete={
          admin
            ? (selected) =>
                setRows((old) =>
                  old.filter(
                    (item) => !selected.some((row) => row.id === item.id),
                  ),
                )
            : undefined
        }
      />
      <p className="muted">
        {tr(
          admin ? "permissions.table.editing" : "permissions.table.readonly",
        )}
      </p>
    </div>
  );
}

function FormExample() {
  const tr = useDemoText();
  return (
    <div className="card auto-root">
      <AutoForm<Entry> actions={false} fields={entryFields(tr)} />
    </div>
  );
}

function SearchExample() {
  const tr = useDemoText();
  const [values, setValues] = useState<Entry>({
    name: "",
    owner: "",
    audit: "",
  });
  const [query, setQuery] = useState<QueryNode | null>(null);
  return (
    <div className="card auto-root">
      <AutoSearch<Entry>
        mode="manual"
        fields={entryFields(tr)}
        value={values}
        onChange={setValues}
        onSearch={(next) => setQuery(next)}
      />
      <h3>{tr("permissions.query")}</h3>
      <pre data-testid="permissions-search-query">
        {query ? JSON.stringify(query, null, 2) : tr("permissions.search.empty")}
      </pre>
      <h3>{tr("permissions.values")}</h3>
      <pre data-testid="permissions-search-values">
        {JSON.stringify(values, null, 2)}
      </pre>
    </div>
  );
}

function DialogExample({
  admin,
  audit,
}: {
  admin: boolean;
  audit: boolean;
}) {
  const tr = useDemoText();
  const dialog = useAutoDialog();
  const included = [
    tr("permissions.name"),
    admin ? tr("permissions.owner") : null,
    audit ? tr("permissions.audit") : null,
  ]
    .filter(Boolean)
    .join(", ");
  return (
    <div className="card auto-root">
      <p className="muted">{tr("permissions.dialog.fields", [included])}</p>
      <button
        type="button"
        className="auto-primary"
        onClick={() =>
          dialog.open<Entry>({
            title: tr("permissions.dialogTitle"),
            fields: entryFields(tr),
            defaultValue: { name: "", owner: "", audit: "" },
          })
        }
      >
        {tr("permissions.openDialog")}
      </button>
    </div>
  );
}

function TabsExample({ audit }: { audit: boolean }) {
  const tr = useDemoText();
  return (
    <div className="card auto-root">
      <AutoTabs
        items={[
          {
            id: "overview",
            label: tr("permissions.overview"),
            content: <p>{tr("permissions.overview")}</p>,
          },
          {
            id: "reports",
            label: tr("permissions.reports"),
            roles: ["admin"],
            content: <p>{tr("permissions.reports")}</p>,
          },
          {
            id: "audit",
            label: tr("permissions.audit"),
            permissions: ["audit:read"],
            content: <p>{tr("permissions.audit")}</p>,
          },
          {
            id: "profile",
            label: tr("permissions.profile"),
            content: <p>{tr("permissions.profile")}</p>,
          },
        ]}
      />
      <p className="muted">
        {tr(audit ? "access.auditGranted" : "access.auditDenied")}
      </p>
    </div>
  );
}

function MenuExample() {
  const tr = useDemoText();
  return (
    <div className="card auto-root">
      <AutoMenu
        label={tr("Navigation")}
        items={[
          { id: "home", label: tr("permissions.home") },
          {
            id: "reports",
            label: tr("permissions.reports"),
            roles: ["admin"],
            children: [
              { id: "quarterly", label: tr("permissions.quarterly") },
            ],
          },
          {
            id: "audit",
            label: tr("permissions.audit"),
            permissions: ["audit:read"],
          },
          { id: "settings", label: tr("permissions.settings") },
        ]}
      />
    </div>
  );
}

function ChatExample({ admin, audit }: { admin: boolean; audit: boolean }) {
  const tr = useDemoText();
  return (
    <div className="card auto-root">
      <AutoChat
        height={280}
        messages={[
          {
            id: "note",
            role: "assistant",
            content: tr("permissions.chat.sample"),
          },
        ]}
        composer={admin}
        header={
          audit ? (
            <button type="button" data-testid="permissions-chat-export">
              {tr("permissions.export")}
            </button>
          ) : null
        }
        onSend={() => undefined}
      />
    </div>
  );
}

export interface PermissionsControls {
  role: string;
  onToggleRole: () => void;
  status: DemoAccessStatus;
  reload: (fail?: boolean) => void;
  switchUser: (userId: string) => void;
}

interface PermissionRule {
  label: string;
  on: boolean;
}

function usePermissionFlags() {
  const access = useAutoConfig().access!;
  return {
    admin: access.hasRole("admin"),
    audit: access.hasPerm("audit:read"),
  };
}

function PermissionsFrame({
  helpKey,
  rules,
  role,
  onToggleRole,
  status,
  reload,
  switchUser,
  children,
}: PermissionsControls & {
  helpKey: string;
  rules: readonly PermissionRule[];
  children: ReactNode;
}) {
  const tr = useDemoText();
  const access = useAutoConfig().access!;
  const snapshot = access.getState();
  const admin = access.hasRole("admin");
  const audit = access.hasPerm("audit:read");
  const toggleAudit = () =>
    access.setState({
      permissions: audit
        ? snapshot.permissions.filter((code) => code !== "audit:read")
        : [...snapshot.permissions, "audit:read"],
    });
  return (
    <section className="permissions-demo" data-testid="permissions-demo">
      <div className="permissions-toolbar">
        <h2>{tr("Permissions in action")}</h2>
        <div className="auto-actions">
          <button
            type="button"
            className="code-button"
            data-testid="permissions-role"
            onClick={onToggleRole}
            disabled={status === "loading"}
          >
            {tr("Role")}: <strong>{role}</strong>
          </button>
          <button type="button" onClick={toggleAudit} disabled={status === "loading"}>
            {tr(audit ? "access.revoke" : "access.grant")}
          </button>
          <p role="status" data-testid="access-status">
            {tr(
              status === "loading"
                ? "access.loading"
                : status === "ready"
                  ? "access.ready"
                  : "access.failed",
            )}
          </p>
        </div>
      </div>
      <div className="permissions-identity">
        <AutoForm<{ userId: string; orgId: string }>
          actions={false}
          value={{
            userId: snapshot.userId ?? "",
            orgId: snapshot.orgIds[0] ?? "",
          }}
          onChange={(next) => {
            if (next.userId !== (snapshot.userId ?? ""))
              switchUser(next.userId || "");
            else access.setState({ orgIds: next.orgId ? [next.orgId] : [] });
          }}
          fields={[
            {
              name: "userId",
              type: "select",
              label: tr("access.user"),
              options: [
                { label: "user-1", value: "user-1" },
                { label: "user-2", value: "user-2" },
              ],
            },
            {
              name: "orgId",
              type: "select",
              label: tr("access.org"),
              disabled: status === "loading",
              options: [
                { label: "org-1", value: "org-1" },
                { label: "org-2", value: "org-2" },
              ],
            },
          ]}
        />
      </div>
      <div className="permissions-tabs">
        <AutoTabs
          defaultValue={["example"]}
          keepMounted
          items={[
            {
              id: "example",
              label: tr("permissions.tab.example"),
              content: (
                <div className="permissions-panel">
                  <p className="muted">{tr(helpKey)}</p>
                  <ul className="permissions-rules">
                    {rules.map((rule) => (
                      <li key={rule.label} data-on={rule.on ? "true" : "false"}>
                        {rule.label}
                      </li>
                    ))}
                  </ul>
                  <div data-testid="permissions-example">{children}</div>
                </div>
              ),
            },
            {
              id: "access",
              label: tr("permissions.tab.access"),
              content: (
                <div className="permissions-panel">
                  <h3>{tr("access.sharedState")}</h3>
                  <p className="muted">{tr("access.tabIsolation")}</p>
                  <div className="auto-actions">
                    {["user-1", "user-2"].map((userId) => (
                      <a
                        key={userId}
                        href={demoUserHref(userId)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {tr("access.openTab", [userId])}
                      </a>
                    ))}
                    <button type="button" onClick={() => switchUser("")}>
                      {tr("access.logoutTab")}
                    </button>
                    <button type="button" onClick={() => reload()}>
                      {tr("mock.reload")}
                    </button>
                    <button type="button" onClick={() => reload(true)}>
                      {tr("access.fail")}
                    </button>
                  </div>
                  {status === "error" && (
                    <div role="alert" className="auto-error">
                      {tr("mock.requestFailed")}{" "}
                      <button type="button" onClick={() => reload()}>
                        {tr("mock.retry")}
                      </button>
                    </div>
                  )}
                  <p className="muted">{tr("access.checks")}</p>
                  <ul className="permissions-checks">
                    <li data-testid="access-check-perm">
                      <code>hasPerm("audit:read")</code>: {String(audit)}
                    </li>
                    <li data-testid="access-check-role">
                      <code>hasRole("admin")</code>: {String(admin)}
                    </li>
                    <li data-testid="access-check-user">
                      <code>hasUser("user-1")</code>: {String(access.hasUser("user-1"))}
                    </li>
                    <li data-testid="access-check-org">
                      <code>hasOrg("org-1")</code>: {String(access.hasOrg("org-1"))}
                    </li>
                  </ul>
                  <details>
                    <summary>{tr("access.snapshot")}</summary>
                    <pre>{JSON.stringify(snapshot, null, 2)}</pre>
                  </details>
                </div>
              ),
            },
          ]}
        />
      </div>
    </section>
  );
}

export function PermissionsDemo(props: PermissionsControls) {
  const tr = useDemoText();
  const { admin, audit } = usePermissionFlags();
  return (
    <PermissionsFrame
      {...props}
      helpKey="permissions.table.help"
      rules={[
        { label: tr("permissions.rule.tableAdmin"), on: admin },
        { label: tr("permissions.rule.audit"), on: audit },
      ]}
    >
      <TableExample admin={admin} />
    </PermissionsFrame>
  );
}

export function FormPermissionsDemo(props: PermissionsControls) {
  const tr = useDemoText();
  const { admin, audit } = usePermissionFlags();
  return (
    <PermissionsFrame
      {...props}
      helpKey="permissions.form.help"
      rules={[
        { label: tr("permissions.rule.owner"), on: admin },
        { label: tr("permissions.rule.audit"), on: audit },
      ]}
    >
      <FormExample />
    </PermissionsFrame>
  );
}

export function SearchPermissionsDemo(props: PermissionsControls) {
  const tr = useDemoText();
  const { admin, audit } = usePermissionFlags();
  return (
    <PermissionsFrame
      {...props}
      helpKey="permissions.search.help"
      rules={[
        { label: tr("permissions.rule.owner"), on: admin },
        { label: tr("permissions.rule.audit"), on: audit },
      ]}
    >
      <SearchExample />
    </PermissionsFrame>
  );
}

export function DialogPermissionsDemo(props: PermissionsControls) {
  const tr = useDemoText();
  const { admin, audit } = usePermissionFlags();
  return (
    <PermissionsFrame
      {...props}
      helpKey="permissions.dialog.help"
      rules={[
        { label: tr("permissions.rule.owner"), on: admin },
        { label: tr("permissions.rule.audit"), on: audit },
      ]}
    >
      <DialogExample admin={admin} audit={audit} />
    </PermissionsFrame>
  );
}

export function TabsPermissionsDemo(props: PermissionsControls) {
  const tr = useDemoText();
  const { admin, audit } = usePermissionFlags();
  return (
    <PermissionsFrame
      {...props}
      helpKey="permissions.tabs.help"
      rules={[
        { label: tr("permissions.rule.reports"), on: admin },
        { label: tr("permissions.rule.audit"), on: audit },
      ]}
    >
      <TabsExample audit={audit} />
    </PermissionsFrame>
  );
}

export function MenuPermissionsDemo(props: PermissionsControls) {
  const tr = useDemoText();
  const { admin, audit } = usePermissionFlags();
  return (
    <PermissionsFrame
      {...props}
      helpKey="permissions.menu.help"
      rules={[
        { label: tr("permissions.rule.reports"), on: admin },
        { label: tr("permissions.rule.audit"), on: audit },
      ]}
    >
      <MenuExample />
    </PermissionsFrame>
  );
}

export function ChatPermissionsDemo(props: PermissionsControls) {
  const tr = useDemoText();
  const { admin, audit } = usePermissionFlags();
  return (
    <PermissionsFrame
      {...props}
      helpKey="permissions.chat.help"
      rules={[
        { label: tr("permissions.rule.composer"), on: admin },
        { label: tr("permissions.rule.export"), on: audit },
      ]}
    >
      <ChatExample admin={admin} audit={audit} />
    </PermissionsFrame>
  );
}
