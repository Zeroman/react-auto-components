import type { Field, AutoTableProps } from "../src";
type Model = { count: number; name: string };
const good: Field<Model> = { name: "count", defaultValue: 1 };
// @ts-expect-error default values follow the field type
const bad: Field<Model> = { name: "count", defaultValue: "wrong" };
// @ts-expect-error fields must exist on the model
const missing: Field<Model> = { name: "missing" };
// @ts-expect-error local data and remote source cannot both own rows
const owners: AutoTableProps<Model> = {
  id: "x",
  rowKey: "name",
  data: [],
  dataSource: async () => ({ rows: [], total: 0 }),
};
void good;
void bad;
void missing;
void owners;
