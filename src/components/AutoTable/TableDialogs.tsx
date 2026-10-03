import type { TipComponent } from "../../core/tip";
import { useAutoText } from "../../core/i18n";
import { AutoDialog } from "../AutoDialog";
import { SettingsPanel } from "./SettingsPanel";
import { deriveFormFields } from "./deriveFormFields";
import { active, type TableSettings } from "./settings";
import type { AutoColumn, TableQuery } from "./types";
import type { Field } from "../../core/types";

export interface TableDialogsProps<T extends object> {
  id: string;
  columns: readonly AutoColumn<T>[];
  formFields?: readonly Field<T>[];
  tipComponent?: TipComponent;
  getId: (row: T) => string;
  sourceRefresh: () => void;
  // Settings dialog
  draft: TableSettings | null;
  setDraft: (settings: TableSettings | null) => void;
  saveSettings: (settings: TableSettings) => void;
  query: TableQuery;
  setLocalQuery: (query: TableQuery) => void;
  onQueryChange?: (query: TableQuery) => void;
  // Edit dialog
  edit: { kind: "add" | "edit"; row?: T } | null;
  setEdit: (edit: { kind: "add" | "edit"; row?: T } | null) => void;
  onAdd?: (values: T) => void | Promise<void>;
  onEdit?: (row: T, values: T) => void | Promise<void>;
  // Delete dialog
  deleting: T[] | null;
  setDeleting: (deleting: T[] | null) => void;
  onDelete?: (rows: T[]) => void | Promise<void>;
  setSelected: (selected: Record<string, true>) => void;
}

export function TableDialogs<T extends object>({
  id,
  columns,
  formFields,
  tipComponent,
  getId,
  sourceRefresh,
  draft,
  setDraft,
  saveSettings,
  query,
  setLocalQuery,
  onQueryChange,
  edit,
  setEdit,
  onAdd,
  onEdit,
  deleting,
  setDeleting,
  onDelete,
  setSelected,
}: TableDialogsProps<T>) {
  const tr = useAutoText();
  const fields = formFields ?? deriveFormFields(columns);

  return (
    <>
      <AutoDialog
        open={!!draft}
        onOpenChange={(open) => {
          if (!open) setDraft(null);
        }}
        title={tr("Table settings")}
        width={760}
        content={
          draft && (
            <SettingsPanel
              value={draft}
              columns={columns}
              onChange={setDraft}
            />
          )
        }
        onSubmit={() => {
          if (draft) {
            saveSettings(draft);
            const next = {
              ...query,
              pageIndex: 0,
              sort: active(draft.sort),
              filter: active(draft.filter),
            };
            setLocalQuery(next);
            onQueryChange?.(next);
          }
        }}
      />
      <AutoDialog<T>
        tipComponent={tipComponent}
        open={!!edit}
        onOpenChange={(open) => {
          if (!open) setEdit(null);
        }}
        title={edit?.kind === "add" ? tr("Add record") : tr("Edit record")}
        fields={fields}
        defaultValue={edit?.row}
        draftKey={`${id}:${edit?.kind}:${edit?.row ? getId(edit.row) : "new"}`}
        showReset
        onSubmit={async (values) => {
          if (edit?.kind === "add") await onAdd?.(values);
          else if (edit?.row) await onEdit?.(edit.row, values);
          sourceRefresh();
        }}
      />
      <AutoDialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title={tr("Delete")}
        content={
          <p>{tr("Delete these {0} records?", [deleting?.length ?? 0])}</p>
        }
        confirmLabel={tr("Delete")}
        onSubmit={async () => {
          if (deleting) await onDelete?.(deleting);
          setSelected({});
          sourceRefresh();
        }}
      />
    </>
  );
}
