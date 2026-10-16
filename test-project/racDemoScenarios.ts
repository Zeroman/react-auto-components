import type { DemoScenario } from "@zeroman.yang/react-auto-components-devtools";

// Server-only definitions: the browser can select a name, never supply actions.
export const racDemoScenarios: Record<string, DemoScenario> = {
  form: {
    route: "form:rac",
    steps: [
      {
        message: "rac.demo.step.form.reset",
        focus: "rac-form-preview",
        action: { cmd: "click", component: "AutoForm", testid: "rac-reset" },
      },
      {
        message: "rac.demo.step.form.name",
        focus: "rac-form-preview",
        action: {
          cmd: "fill",
          component: "AutoForm",
          names: ["Project name", "项目名称"],
          value: "Nebula / 星云计划",
        },
      },
      {
        message: "rac.demo.step.form.budget",
        focus: "rac-form-json",
        action: {
          cmd: "fill",
          component: "AutoForm",
          names: ["Project budget", "项目预算"],
          value: "4800",
        },
      },
      {
        message: "rac.demo.step.form.enable",
        focus: "rac-form-fields",
        action: {
          cmd: "fill",
          component: "AutoForm",
          names: ["Enabled", "已启用"],
          value: "true",
        },
      },
      {
        message: "rac.demo.step.form.code",
        focus: "rac-form-preview",
        action: {
          cmd: "fill",
          component: "AutoForm",
          names: ["Internal code", "内部代码"],
          value: "RAC-2026",
        },
      },
      {
        message: "rac.demo.step.form.submit",
        focus: "rac-form-submitted",
        action: { cmd: "click", component: "AutoForm", testid: "rac-submit" },
      },
    ],
  },
  search: {
    route: "search:rac",
    steps: [
      {
        message: "rac.demo.step.search.reset",
        focus: "rac-search-results",
        action: {
          cmd: "click",
          component: "AutoSearch",
          testid: "rac-search-reset",
        },
      },
      {
        message: "rac.demo.step.search.instant",
        focus: "rac-search-fields",
        action: {
          cmd: "fill",
          names: ["Search mode", "搜索模式"],
          value: "instant",
        },
        holdMs: 3000,
      },
      {
        message: "rac.demo.step.search.match",
        focus: "rac-search-results",
        action: {
          cmd: "fill",
          component: "AutoSearch",
          names: ["Project name", "项目名称"],
          value: "Atlas",
        },
      },
      {
        message: "rac.demo.step.search.empty",
        focus: "rac-search-results",
        action: {
          cmd: "fill",
          component: "AutoSearch",
          names: ["Project name", "项目名称"],
          value: "No such project",
        },
      },
      {
        message: "rac.demo.step.search.reset",
        focus: "rac-search-results",
        action: {
          cmd: "click",
          component: "AutoSearch",
          testid: "rac-search-reset",
        },
      },
      {
        message: "rac.demo.step.search.manual",
        focus: "rac-search-fields",
        action: {
          cmd: "fill",
          names: ["Search mode", "搜索模式"],
          value: "manual",
        },
        holdMs: 3000,
      },
      {
        message: "rac.demo.step.search.draft",
        focus: "rac-search-results",
        action: {
          cmd: "fill",
          component: "AutoSearch",
          names: ["Project name", "项目名称"],
          value: "Atlas",
        },
        holdMs: 4500,
      },
      {
        message: "rac.demo.step.search.apply",
        focus: "rac-search-results",
        action: { cmd: "click", component: "AutoSearch", testid: "rac-search" },
      },
    ],
  },
};
