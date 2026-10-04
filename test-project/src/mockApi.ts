import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import {
  isQueryNode,
  matchesQuery,
  type QueryNode,
} from "@zeroman.yang/react-auto-components";
import { makeProjects, type Project } from "./data.ts";

export const MOCK_PROJECTS_PATH = "/api/projects";
const rows = makeProjects(24);

interface MockQueryBody {
  filter: unknown;
  sort?: unknown;
  pageIndex?: unknown;
  pageSize?: unknown;
  rsql?: unknown;
}

/** The server never parses `rsql`; it only echoes it back for assertions. */
export function mockApiPlugin(): Plugin {
  return {
    name: "rac-mock-api",
    configureServer(server) {
      server.middlewares.use(
        (req: IncomingMessage, res: ServerResponse, next: () => void) => {
          const path = (req.url ?? "").split("?")[0];
          if (req.method === "OPTIONS" && path.startsWith("/api/")) {
            setCors(res);
            res.statusCode = 204;
            res.end();
            return;
          }
          if (req.method !== "POST" || path !== MOCK_PROJECTS_PATH) {
            next();
            return;
          }
          setCors(res);
          let raw = "";
          req.on("data", (chunk) => {
            raw += chunk;
          });
          req.on("end", () => {
            let body: MockQueryBody;
            try {
              body = JSON.parse(raw || "{}") as MockQueryBody;
            } catch {
              respond(res, 400, { error: "Invalid JSON body." });
              return;
            }
            if (!isQueryNode(body.filter)) {
              respond(res, 400, { error: "filter is not a valid query tree." });
              return;
            }
            const { pageIndex, pageSize } = clampPage(body);
            const filtered = rows.filter((row) =>
              matchesQuery(row, body.filter as QueryNode),
            );
            applySort(filtered, body.sort);
            respond(res, 200, {
              rows: filtered.slice(
                pageIndex * pageSize,
                (pageIndex + 1) * pageSize,
              ),
              total: filtered.length,
              echo: { rsql: typeof body.rsql === "string" ? body.rsql : "" },
            });
          });
        },
      );
    },
  };
}

function setCors(res: ServerResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function respond(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function clampPage(body: MockQueryBody): {
  pageIndex: number;
  pageSize: number;
} {
  const pageIndex =
    typeof body.pageIndex === "number" &&
    Number.isInteger(body.pageIndex) &&
    body.pageIndex >= 0
      ? body.pageIndex
      : 0;
  const pageSize =
    typeof body.pageSize === "number" &&
    Number.isInteger(body.pageSize) &&
    body.pageSize >= 1
      ? Math.min(body.pageSize, 100)
      : 6;
  return { pageIndex, pageSize };
}

function applySort(filtered: Project[], sort: unknown): void {
  const keys = sortKeys(sort);
  if (!keys.length) return;
  filtered.sort((a, b) => {
    for (const { id, desc } of keys) {
      const av = a[id as keyof Project],
        bv = b[id as keyof Project];
      const n = av === bv ? 0 : av > bv ? 1 : -1;
      if (n) return desc ? -n : n;
    }
    return 0;
  });
}

function sortKeys(sort: unknown): { id: string; desc: boolean }[] {
  if (!Array.isArray(sort)) return [];
  return sort.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const record = entry as Record<string, unknown>;
    return typeof record.id === "string"
      ? [{ id: record.id, desc: record.desc === true }]
      : [];
  });
}
