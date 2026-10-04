import {
  serializeRsql,
  type DataSource,
} from "@zeroman.yang/react-auto-components";
import type { Project } from "./data";

export const MOCK_PROJECTS_URL = "/api/projects";

/**
 * HTTP data source for the local mock API. The RSQL string travels the wire
 * next to the query AST; the server echoes it back untouched for assertions.
 */
export function remoteSource(
  url: string = MOCK_PROJECTS_URL,
): DataSource<Project> {
  return async (query, { signal }) => {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({ ...query, rsql: serializeRsql(query.filter) }),
    });
    if (!response.ok)
      throw new Error(
        `Mock API responded ${response.status} ${response.statusText}.`,
      );
    return (await response.json()) as { rows: Project[]; total: number };
  };
}
