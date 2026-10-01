import { useMemo } from "react";
import { useDemoText } from "./i18n";
import type {
  AutoColumn,
  Field,
  DataSource,
} from "@zeroman/react-auto-components";
import { matchesQuery } from "@zeroman/react-auto-components";
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
      label: tr("项目名称"),
      width: 220,
      pin: "left",
      copyable: true,
    },
    {
      key: "owner",
      label: tr("负责人"),
      width: 110,
      filterable: true,
    },
    {
      key: "status",
      label: tr("状态"),
      width: 110,
      filterable: true,
    },
    {
      key: "budget",
      label: tr("预算"),
      type: "number",
      width: 130,
      align: "right",
      summary: true,
      format: (value) => `¥ ${Number(value).toLocaleString()}`,
    },
    {
      key: "progress",
      label: tr("进度"),
      type: "progress",
      width: 140,
    },
    {
      key: "region",
      label: tr("地区"),
      width: 110,
      filterable: true,
    },
    {
      key: "date",
      label: tr("交付日期"),
      width: 130,
    },
  ];
  const fields: Field<Project>[] = [
    {
      name: "name",
      label: tr("项目名称"),
      required: true,
      placeholder: tr("例如：客户数据平台"),
      span: 2,
    },
    {
      name: "owner",
      label: tr("负责人"),
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
      label: tr("状态"),
      type: "select",
      defaultValue: "Pending Start",
      options: ["In Progress", "Completed", "Pending Start"].map((value) => ({
        value,
        label: tr(value),
      })),
    },
    {
      name: "budget",
      label: tr("预算"),
      type: "integer",
      defaultValue: 10000,
      min: 0,
    },
    {
      name: "progress",
      label: tr("进度"),
      type: "integer",
      defaultValue: 0,
      min: 0,
      max: 100,
    },
    {
      name: "region",
      label: tr("地区"),
      type: "select",
      options: ["Shanghai", "Hangzhou", "Shenzhen"].map((value) => ({
        value,
        label: tr(value),
      })),
      defaultValue: "Shanghai",
    },
    {
      name: "date",
      label: tr("交付日期"),
      type: "date",
      defaultValue: "2026-10-01",
    },
    {
      name: "active",
      label: tr("启用项目"),
      type: "switch",
      defaultValue: true,
    },
  ];
  const searchFields: Field<Project>[] = [
    {
      name: "name",
      label: tr("项目名称"),
      match: "contains",
      placeholder: tr("搜索项目…"),
    },
    {
      name: "status",
      label: tr("状态"),
      type: "select",
      options: ["In Progress", "Completed", "Pending Start"].map((value) => ({
        value,
        label: tr(value),
      })),
    },
    {
      name: "region",
      label: tr("地区"),
      type: "select",
      more: true,
      options: ["Shanghai", "Hangzhou", "Shenzhen"].map((value) => ({
        value,
        label: tr(value),
      })),
    },
  ];
  const galleryFields: Field<GalleryRecord>[] = [
    {
      name: "title",
      label: tr("任务名称"),
      required: true,
      placeholder: tr("输入完整的任务或工单标题"),
      span: 2,
    },
    {
      name: "category",
      label: tr("任务类别"),
      type: "autocomplete",
      placeholder: tr("可输入或选择推荐类别"),
      defaultValue: "Technical Architecture",
      options: [
        {
          label: tr("技术架构重构"),
          value: "Technical Architecture",
        },
        {
          label: tr("设计系统建设"),
          value: "Design System",
        },
        {
          label: tr("性能与可用性优化"),
          value: "Performance Optimization",
        },
        {
          label: tr("自动化测试与发布"),
          value: "Engineering Delivery",
        },
        {
          label: tr("安全合规性审计"),
          value: "Security & Compliance",
        },
      ],
    },
    {
      name: "department",
      label: tr("归属部门"),
      type: "cascader",
      defaultValue: ["tech", "frontend"],
      options: [
        {
          value: "tech",
          label: tr("研发中心"),
          children: [
            {
              value: "frontend",
              label: tr("前端工程部"),
            },
            {
              value: "backend",
              label: tr("基础平台部"),
            },
            {
              value: "ai",
              label: tr("认知智能部"),
            },
          ],
        },
        {
          value: "product",
          label: tr("产品中心"),
          children: [
            {
              value: "core",
              label: tr("核心体验组"),
            },
            {
              value: "growth",
              label: tr("增长与留存组"),
            },
          ],
        },
      ],
    },
    {
      name: "priority",
      label: tr("优先级"),
      type: "radio",
      defaultValue: "High",
      options: [
        {
          label: tr("日常 P3"),
          value: "Low",
        },
        {
          label: tr("重要 P2"),
          value: "Medium",
        },
        {
          label: tr("紧迫 P1"),
          value: "High",
        },
      ],
    },
    {
      name: "level",
      label: tr("标签分级"),
      type: "select-v2",
      defaultValue: "tag-1",
      options: Array.from(
        {
          length: 40,
        },
        (_, i) => ({
          value: `tag-${i + 1}`,
          label: tr("业务标签 #{0} ({1})", [
            i + 1,
            [tr("核心"), tr("拓展"), tr("归档"), tr("测试")][i % 4],
          ]),
        }),
      ),
    },
    {
      name: "period",
      label: tr("执行周期"),
      type: "daterange",
      span: 2,
      defaultValue: ["2026-10-01", "2026-11-15"],
      shortcuts: [
        {
          label: tr("本月"),
          value: () => ["2026-10-01", "2026-10-31"],
        },
        {
          label: tr("第四季度"),
          value: () => ["2026-10-01", "2026-12-31"],
        },
        {
          label: tr("跨年规划"),
          value: () => ["2026-10-01", "2027-03-31"],
        },
      ],
    },
    {
      name: "budget",
      label: tr("预期投入 (元)"),
      type: "integer",
      min: 0,
      defaultValue: 25000,
    },
    {
      name: "discount",
      label: tr("进度系数 (%)"),
      type: "percentage",
      defaultValue: "85.5",
    },
    {
      name: "notify",
      label: tr("实时通知订阅"),
      type: "switch",
      defaultValue: true,
    },
    {
      name: "notes",
      label: tr("详细备忘与约束"),
      type: "textarea",
      placeholder: tr("在此输入任务执行要点与上下文约束条件…"),
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
