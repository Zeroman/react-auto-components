import {
  serializeRsql,
  type DataSource,
} from "@zeroman.yang/react-auto-components";
import { createSource, makeProjects, type Project } from "./data";

export const MOCK_PROJECTS_URL = "/api/projects";

/**
 * HTTP data source for the local mock API. The RSQL string travels the wire
 * next to the query AST; the server echoes it back untouched for assertions.
 * Falls back to the in-browser mock source only when static hosting returns
 * 404 for the default mock endpoint.
 */
export function remoteSource(
  url: string = MOCK_PROJECTS_URL,
): DataSource<Project> {
  let fallback: DataSource<Project> | undefined;
  return async (query, { signal }) => {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({ ...query, rsql: serializeRsql(query.filter) }),
    });
    if (!response.ok) {
      if (url === MOCK_PROJECTS_URL && response.status === 404) {
        fallback ??= createSource(makeProjects(24));
        return fallback(query, { signal });
      }
      throw new Error(
        `Mock API responded ${response.status} ${response.statusText}.`,
      );
    }
    return (await response.json()) as { rows: Project[]; total: number };
  };
}
