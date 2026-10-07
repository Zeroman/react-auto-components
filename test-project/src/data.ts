import { useMemo } from "react";
import { useDemoText } from "./i18n";
import type {
  AutoColumn,
  Field,
  DataSource,
} from "@zeroman.yang/react-auto-components";
import { matchesQuery } from "@zeroman.yang/react-auto-components";
export interface Project {
  id: string;
  name: string;
  owner: string;
  status: string;
  budget: number;
  progress: number;
  region: string;
  active: boolean;
  date: string;
  department: string;
}
const names = [
  "Customer Data Platform",
  "Brand Website Upgrade",
  "Mobile Experience Optimization",
  "Automated Delivery System",
  "Data Analytics Workbench",
  "Order Service Refactoring",
  "Design System Development",
  "Knowledge Base Migration",
];
const people = ["Chen Ruolin", "Lin Yu'an", "Zhou Zimo", "Li Siyuan"];
export const departments = ["Engineering", "Product", "Operations", "Design"];
export function makeProjects(count: number): Project[] {
  return Array.from(
    {
      length: count,
    },
    (_, i) => ({
      id: String(i + 1),
      name: `${names[i % names.length]}${i >= 8 ? ` ${i + 1}` : ""}`,
      owner: people[i % 4],
      status: ["In Progress", "Completed", "Pending Start"][i % 3],
      budget: 12000 + i * 850,
      progress: (i * 13 + 32) % 101,
      region: ["Shanghai", "Hangzhou", "Shenzhen"][i % 3],
      active: i % 4 !== 0,
      date: `2026-09-${String((i % 28) + 1).padStart(2, "0")}`,
      department: departments[i % 4],
    }),
  );
}
// Larger pools drive the massive-data demo: unlike makeProjects, values repeat
// across the row count the way real aggregated datasets do — no unique suffixes,
// bucketed budgets, and dates spread over the whole year.
const massiveNames = [
  ...names,
  "Realtime Data Pipeline",
  "Edge Gateway Rollout",
  "Compliance Reporting Engine",
  "Customer Portal Redesign",
  "Inventory Forecast Model",
  "Multi-region CDN Upgrade",
  "Payment Reconciliation Job",
  "Zero-downtime Migration",
];
const massivePeople = [
  ...people,
  "Wang Xiaoyu",
  "Zhao Mingxuan",
  "Sun Qihang",
  "Xu Lanqing",
];
const massiveStatuses = ["In Progress", "Completed", "Pending Start"];
const massiveRegions = ["Shanghai", "Hangzhou", "Shenzhen"];
export function makeMassiveProjects(count: number): Project[] {
  return Array.from(
    {
      length: count,
    },
    (_, i) => ({
      id: String(i + 1),
      // Strided picks keep adjacent rows varied while every value repeats
      // heavily across a huge row count.
      name: massiveNames[(i * 7) % massiveNames.length],
      owner: massivePeople[(i * 3) % massivePeople.length],
      status: massiveStatuses[i % 3],
      budget: 12000 + (i % 5) * 15000,
      progress: (i * 13 + 32) % 101,
      region: massiveRegions[i % 3],
      active: i % 4 !== 0,
      date: `2026-${String((i % 12) + 1).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`,
      department: departments[i % 4],
    }),
  );
}
export function createSource(rows: Project[]): DataSource<Project> {
  return async (q, { signal }) => {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, 120);
      signal.addEventListener(
        "abort",
        () => {
          clearTimeout(timer);
          reject(new DOMException("Aborted", "AbortError"));
        },
        {
          once: true,
        },
      );
    });
    const filtered = rows.filter((row) => matchesQuery(row, q.filter));
    filtered.sort((a, b) => {
      for (const sort of q.sort) {
        const av = a[sort.id as keyof Project],
          bv = b[sort.id as keyof Project];
        const n = av === bv ? 0 : av > bv ? 1 : -1;
        if (n) return sort.desc ? -n : n;
      }
      return 0;
    });
    return {
      rows: filtered.slice(
        q.pageIndex * q.pageSize,
        (q.pageIndex + 1) * q.pageSize,
      ),
      total: filtered.length,
    };
  };
}
export interface GalleryRecord {
  title: string;
  category: string;
  department: string[];
  priority: string;
  level: string;
  period: [string, string];
  budget: number;
  discount: string;
  notify: boolean;
  notes: string;
}
function createDemoData(
  tr: (key: string, values?: readonly unknown[]) => string,
) {
  const columns: AutoColumn<Project>[] = [
    {
      key: "name",
      label: tr("Project Name"),
      width: 220,
      pin: "left",
      copyable: true,
    },
    {
      key: "owner",
      label: tr("Owner"),
      width: 110,
      filterable: true,
    },
    {
      key: "status",
      label: tr("Status"),
      width: 110,
      filterable: true,
    },
    {
      key: "budget",
      label: tr("Budget"),
      type: "number",
      width: 130,
      align: "right",
      summary: true,
      format: (value) => `¥ ${Number(value).toLocaleString()}`,
    },
    {
      key: "progress",
      label: tr("Progress"),
      type: "progress",
      width: 140,
    },
    {
      key: "region",
      label: tr("Region"),
      width: 110,
      filterable: true,
    },
    {
      key: "date",
      label: tr("Delivery Date"),
      width: 130,
    },
  ];
  const fields: Field<Project>[] = [
    {
      name: "name",
      label: tr("Project Name"),
      required: true,
      placeholder: tr("e.g., Customer Data Platform"),
      span: 2,
    },
    {
      name: "owner",
      label: tr("Owner"),
      required: true,
      type: "select",
      options: people.map((value) => ({
        label: tr(value),
        value,
      })),
      defaultValue: "Chen Ruolin",
    },
    {
      name: "status",
      label: tr("Status"),
      type: "select",
      defaultValue: "Pending Start",
      options: ["In Progress", "Completed", "Pending Start"].map((value) => ({
        value,
        label: tr(value),
      })),
    },
    {
      name: "budget",
      label: tr("Budget"),
      type: "integer",
      defaultValue: 10000,
      min: 0,
    },
    {
      name: "progress",
      label: tr("Progress"),
      type: "integer",
      defaultValue: 0,
      min: 0,
      max: 100,
    },
    {
      name: "region",
      label: tr("Region"),
      type: "select",
      options: ["Shanghai", "Hangzhou", "Shenzhen"].map((value) => ({
        value,
        label: tr(value),
      })),
      defaultValue: "Shanghai",
    },
    {
      name: "date",
      label: tr("Delivery Date"),
      type: "date",
      defaultValue: "2026-10-01",
    },
    {
      name: "active",
      label: tr("Enable project"),
      type: "switch",
      defaultValue: true,
    },
  ];
  const searchFields: Field<Project>[] = [
    {
      name: "name",
      label: tr("Project Name"),
      search: { match: "contains" },
      placeholder: tr("Search projects…"),
    },
    {
      name: "status",
      label: tr("Status"),
      type: "select",
      options: ["In Progress", "Completed", "Pending Start"].map((value) => ({
        value,
        label: tr(value),
      })),
    },
    {
      name: "region",
      label: tr("Region"),
      type: "select",
      search: { more: true },
      options: ["Shanghai", "Hangzhou", "Shenzhen"].map((value) => ({
        value,
        label: tr(value),
      })),
    },
  ];
  const complexSearchFields: Field<Project>[] = [
    {
      name: "name",
      label: tr("Project Name"),
      search: { match: "contains" },
      placeholder: tr("Search projects…"),
    },
    {
      name: "owner",
      label: tr("Owner"),
      type: "select",
      search: { more: true },
      options: people.map((value) => ({
        label: tr(value),
        value,
      })),
    },
    {
      name: "status",
      label: tr("Status"),
      type: "select",
      search: { more: true },
      options: ["In Progress", "Completed", "Pending Start"].map((value) => ({
        value,
        label: tr(value),
      })),
    },
    {
      name: "region",
      label: tr("Region"),
      type: "select",
      search: { more: true },
      options: ["Shanghai", "Hangzhou", "Shenzhen"].map((value) => ({
        value,
        label: tr(value),
      })),
    },
    {
      name: "department",
      label: tr("Department"),
      type: "select",
      search: { more: true },
      options: departments.map((value) => ({
        value,
        label: tr(value),
      })),
    },
    {
      name: "date",
      label: tr("Delivery Date"),
      type: "date",
      search: { more: true, match: "contains" },
    },
    {
      name: "active",
      label: tr("Active Status"),
      type: "select",
      search: { more: true },
      options: [
        { label: tr("Active"), value: true },
        { label: tr("Inactive"), value: false },
      ],
    },
  ];
  const galleryFields: Field<GalleryRecord>[] = [
    {
      name: "title",
      label: tr("Task Name"),
      required: true,
      placeholder: tr("Enter the full task or ticket title"),
      span: 2,
    },
    {
      name: "category",
      label: tr("Task Category"),
      type: "autocomplete",
      placeholder: tr("Type or select a recommended category"),
      defaultValue: "Technical Architecture",
      options: [
        {
          label: tr("Technical Architecture Refactoring"),
          value: "Technical Architecture",
        },
        {
          label: tr("Design System Development"),
          value: "Design System",
        },
        {
          label: tr("Performance & Usability Optimization"),
          value: "Performance Optimization",
        },
        {
          label: tr("Automated Testing & Release"),
          value: "Engineering Delivery",
        },
        {
          label: tr("Security & Compliance Audit"),
          value: "Security & Compliance",
        },
      ],
    },
    {
      name: "department",
      label: tr("Owning Department"),
      type: "cascader",
      defaultValue: ["tech", "frontend"],
      options: [
        {
          value: "tech",
          label: tr("R&D Center"),
          children: [
            {
              value: "frontend",
              label: tr("Frontend Engineering"),
            },
            {
              value: "backend",
              label: tr("Platform Infrastructure"),
            },
            {
              value: "ai",
              label: tr("Cognitive Intelligence"),
            },
          ],
        },
        {
          value: "product",
          label: tr("Product Center"),
          children: [
            {
              value: "core",
              label: tr("Core Experience Team"),
            },
            {
              value: "growth",
              label: tr("Growth & Retention Team"),
            },
          ],
        },
      ],
    },
    {
      name: "priority",
      label: tr("Priority"),
      type: "radio",
      defaultValue: "High",
      options: [
        {
          label: tr("Routine P3"),
          value: "Low",
        },
        {
          label: tr("Important P2"),
          value: "Medium",
        },
        {
          label: tr("Urgent P1"),
          value: "High",
        },
      ],
    },
    {
      name: "level",
      label: tr("Tag Tier"),
      type: "select-v2",
      defaultValue: "tag-1",
      options: Array.from(
        {
          length: 40,
        },
        (_, i) => ({
          value: `tag-${i + 1}`,
          label: tr("Business tag #{0} ({1})", [
            i + 1,
            [tr("Core"), tr("Expansion"), tr("Archive"), tr("Test")][i % 4],
          ]),
        }),
      ),
    },
    {
      name: "period",
      label: tr("Execution Cycle"),
      type: "daterange",
      span: 2,
      defaultValue: ["2026-10-01", "2026-11-15"],
      shortcuts: [
        {
          label: tr("This Month"),
          value: () => ["2026-10-01", "2026-10-31"],
        },
        {
          label: tr("Q4"),
          value: () => ["2026-10-01", "2026-12-31"],
        },
        {
          label: tr("Cross-Year Planning"),
          value: () => ["2026-10-01", "2027-03-31"],
        },
      ],
    },
    {
      name: "budget",
      label: tr("Expected Investment (CNY)"),
      type: "integer",
      min: 0,
      defaultValue: 25000,
    },
    {
      name: "discount",
      label: tr("Progress Factor (%)"),
      type: "percentage",
      defaultValue: "85.5",
    },
    {
      name: "notify",
      label: tr("Real-time Notification Subscription"),
      type: "switch",
      defaultValue: true,
    },
    {
      name: "notes",
      label: tr("Detailed Notes & Constraints"),
      type: "textarea",
      placeholder: tr("Enter task execution points and context constraints…"),
      rows: 3,
      span: 2,
      defaultValue:
        "Must stay aligned with Design Spec 2.0 and pass the automated layout regression suite before delivery.",
    },
  ];
  return {
    columns,
    fields,
    searchFields,
    complexSearchFields,
    galleryFields,
  };
}
export function useDemoData() {
  const tr = useDemoText();
  return useMemo(() => {
    const data = createDemoData(tr);
    return {
      ...data,
      columns: data.columns.map((column) =>
        column.format
          ? column
          : { ...column, format: (value: unknown) => tr(String(value ?? "")) },
      ),
    };
  }, [tr]);
}
