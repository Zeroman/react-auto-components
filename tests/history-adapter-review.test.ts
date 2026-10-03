import { waitFor } from "@testing-library/react";
import { expect, test } from "vitest";
import {
  createMemoryHistory,
  createHashHistory,
  createBrowserHistory,
} from "../src/core/navigation/history";
import type {
  AutoHistoryAdapter,
  AutoLocation,
} from "../src/core/navigation/types";

const factories = [
  {
    name: "memory",
    create() {
      const history = createMemoryHistory({ path: ["home"] });
      return {
        history,
        back: () => history.back(),
        forward: () => history.forward(),
      };
    },
  },
  {
    name: "hash",
    create() {
      window.history.replaceState(null, "", "/#/home");
      return {
        history: createHashHistory(),
        back: () => window.history.back(),
        forward: () => window.history.forward(),
      };
    },
  },
  {
    name: "browser",
    create() {
      window.history.replaceState(null, "", "/home");
      return {
        history: createBrowserHistory(),
        back: () => window.history.back(),
        forward: () => window.history.forward(),
      };
    },
  },
];

for (const factory of factories) {
  test(`${factory.name} history notifies each traversal once and removes its subscription`, async () => {
    const { history, back, forward } = factory.create();
    const adapter: AutoHistoryAdapter = history;
    const locations: AutoLocation[] = [];
    const unsubscribe = adapter.subscribe((location) =>
      locations.push(location),
    );
    try {
      await adapter.push({ path: ["details"], params: { id: "42" } });
      locations.length = 0;
      back();
      await waitFor(() => expect(adapter.read().path).toEqual(["home"]));
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(locations).toHaveLength(1);
      expect(locations[0].path).toEqual(["home"]);
      unsubscribe();
      forward();
      await waitFor(() => expect(adapter.read().path).toEqual(["details"]));
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(locations).toHaveLength(1);
    } finally {
      unsubscribe();
    }
  });
}
