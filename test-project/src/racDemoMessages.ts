// RAC live demo catalog. English is the source. Only zh-CN is translated;
// every other locale falls back to the English value.
const messages: Record<string, Record<string, string>> = {
  en: {
    "rac.demo.start": "Start demonstration",
    "rac.demo.stop": "Stop",
    "rac.demo.unavailable":
      "Start pnpm dev:agent locally to enable this demonstration.",
    "rac.demo.checking": "Waiting for the local demonstration bridge…",
    "rac.demo.ready":
      "The demonstration drives this page. Watch the highlighted area.",
    "rac.demo.starting": "Starting the demonstration…",
    "rac.demo.stopping": "Stopping…",
    "rac.demo.progress": "Step {0} of {1}",
    "rac.demo.watch": "Watch the highlighted area.",
    "rac.demo.complete": "Demonstration complete.",
    "rac.demo.stopped": "Demonstration stopped.",
    "rac.demo.error": "The demonstration could not continue.",
    "rac.demo.timeout": "The demonstration did not start. You can try again.",

    "rac.demo.step.form.reset":
      "Watch the preview return to Atlas, with the internal code hidden.",
    "rac.demo.step.form.name":
      "Watch the project title change as RAC fills the name.",
    "rac.demo.step.form.budget":
      "Watch the current JSON: the budget becomes the number 4800.",
    "rac.demo.step.form.enable":
      "Watch the form: enabling the project reveals the internal code field.",
    "rac.demo.step.form.code": "Watch the preview receive the code RAC-2026.",
    "rac.demo.step.form.submit":
      "Watch the submitted value receive the current form data. Nothing is sent to a remote service.",
    "rac.demo.step.search.reset":
      "Watch the results return to all six projects.",
    "rac.demo.step.search.instant":
      "Watch the mode switch to Instant: edits will apply automatically.",
    "rac.demo.step.search.match":
      "Watch the list shrink to the two projects containing Atlas.",
    "rac.demo.step.search.empty":
      "Watch the list become empty for a name that does not match.",
    "rac.demo.step.search.manual":
      "Watch the mode switch to Manual: edits now remain a draft until Search.",
    "rac.demo.step.search.draft":
      "Watch the results stay at six projects even though the name is now Atlas. The draft has not been applied.",
    "rac.demo.step.search.apply":
      "Watch Search apply the draft: only the two Atlas projects remain.",

    "RAC live demo": "RAC live demo",
    "Watch the project card follow a controlled AutoForm, including a field hidden until Enabled is on.":
      "Watch the project card follow a controlled AutoForm, including a field hidden until Enabled is on.",
    "Watch six projects follow a controlled AutoSearch in instant or manual mode.":
      "Watch six projects follow a controlled AutoSearch in instant or manual mode.",
    "Fill the project name, turn Enabled on, and the internal code field appears. Fill the code and the preview updates.":
      "Fill the project name, turn Enabled on, and the internal code field appears. Fill the code and the preview updates.",
    "Project name": "Project name",
    "Project budget": "Project budget",
    Enabled: "Enabled",
    "Not enabled": "Not enabled",
    "Internal code": "Internal code",
    "Shown only when enabled": "Shown only when enabled",
    "Live preview": "Live preview",
    "Current value": "Current value",
    "Submitted value": "Submitted value",
    "Nothing submitted yet.": "Nothing submitted yet.",
    "No code yet": "No code yet",
    "Untitled project": "Untitled project",
    "Empty budget": "Empty budget",
    "Controlled form": "Controlled form",
    "Search mode": "Search mode",
    Instant: "Instant",
    Manual: "Manual",
    "Instant applies every edit. Manual keeps the result list until Search. Switching mode keeps the draft and the last applied results. Reset shows all six projects.":
      "Instant applies every edit. Manual keeps the result list until Search. Switching mode keeps the draft and the last applied results. Reset shows all six projects.",
    "Name contains": "Name contains",
    "Contains, ignores case": "Contains, ignores case",
    "Project status": "Project status",
    "RAC live status active": "Active",
    "RAC live all statuses": "All statuses",
    "RAC live status paused": "Paused",
    "Controlled search": "Controlled search",
    "Criteria draft": "Criteria draft",
    "Applied criteria": "Applied criteria",
    Results: "Results",
    "{0} projects": "{0} projects",
    "No projects match the applied criteria.":
      "No projects match the applied criteria.",
    "Draft changed. Results stay on the applied criteria until you click Search.":
      "Draft changed. Results stay on the applied criteria until you click Search.",
    "Applied results stay until the next edit in instant mode.":
      "Applied results stay until the next edit in instant mode.",
  },
  "zh-CN": {
    "rac.demo.start": "开始演示",
    "rac.demo.stop": "停止",
    "rac.demo.unavailable": "请在本地运行 pnpm dev:agent 以启用此演示。",
    "rac.demo.checking": "正在等待本地演示桥…",
    "rac.demo.ready": "演示会自动操作此页面。请观看高亮区域。",
    "rac.demo.starting": "正在开始演示…",
    "rac.demo.stopping": "正在停止…",
    "rac.demo.progress": "第 {0} 步，共 {1} 步",
    "rac.demo.watch": "请观看高亮区域。",
    "rac.demo.complete": "演示已完成。",
    "rac.demo.stopped": "演示已停止。",
    "rac.demo.error": "演示无法继续。",
    "rac.demo.timeout": "演示没有开始。可以再试一次。",

    "rac.demo.step.form.reset":
      "关注预览：恢复为 Atlas，内部代码字段保持隐藏。",
    "rac.demo.step.form.name": "关注项目标题：RAC 填写名称后，标题同步改变。",
    "rac.demo.step.form.budget": "关注当前 JSON：预算变成数字 4800。",
    "rac.demo.step.form.enable": "关注表单：启用项目后，内部代码字段出现。",
    "rac.demo.step.form.code": "关注预览：内部代码同步显示为 RAC-2026。",
    "rac.demo.step.form.submit":
      "关注提交值：当前表单数据被提交到本地展示区，不会发送到远程服务。",
    "rac.demo.step.search.reset": "关注结果列表：恢复全部六个项目。",
    "rac.demo.step.search.instant":
      "关注模式：切换到即时，接下来编辑会自动应用。",
    "rac.demo.step.search.match":
      "关注结果列表：只剩名称包含 Atlas 的两个项目。",
    "rac.demo.step.search.empty":
      "关注结果列表：输入不匹配的名称后，列表为空。",
    "rac.demo.step.search.manual":
      "关注模式：切换到手动，编辑只更新草稿，点击搜索才会应用。",
    "rac.demo.step.search.draft":
      "关注结果列表：名称已变成 Atlas，但仍显示六个项目，因为草稿还未应用。",
    "rac.demo.step.search.apply":
      "关注结果列表：服务端点击搜索后，只剩两个 Atlas 项目。",

    "RAC live demo": "RAC 联动演示",
    "Watch the project card follow a controlled AutoForm, including a field hidden until Enabled is on.":
      "项目卡片跟随受控 AutoForm 更新。未启用时，内部代码字段保持隐藏。",
    "Watch six projects follow a controlled AutoSearch in instant or manual mode.":
      "六个固定项目跟随受控 AutoSearch，可在即时或手动模式间切换。",
    "Fill the project name, turn Enabled on, and the internal code field appears. Fill the code and the preview updates.":
      "填写项目名称，打开“已启用”，内部代码字段会出现。填写代码后，预览会更新。",
    "Project name": "项目名称",
    "Project budget": "项目预算",
    Enabled: "已启用",
    "Not enabled": "未启用",
    "Internal code": "内部代码",
    "Shown only when enabled": "仅在启用后显示",
    "Live preview": "实时预览",
    "Current value": "当前值",
    "Submitted value": "提交值",
    "Nothing submitted yet.": "尚未提交。",
    "No code yet": "尚未填写代码",
    "Untitled project": "未命名项目",
    "Empty budget": "预算为空",
    "Controlled form": "受控表单",
    "Search mode": "搜索模式",
    Instant: "即时",
    Manual: "手动",
    "Instant applies every edit. Manual keeps the result list until Search. Switching mode keeps the draft and the last applied results. Reset shows all six projects.":
      "即时模式每次编辑都会应用。手动模式在点击“搜索”前不改变结果列表。切换模式会保留草稿和上次应用的结果。重置会重新显示全部六个项目。",
    "Name contains": "名称包含",
    "Contains, ignores case": "包含匹配，忽略大小写",
    "Project status": "项目状态",
    "RAC live status active": "活跃",
    "RAC live all statuses": "全部状态",
    "RAC live status paused": "已暂停",
    "Controlled search": "受控搜索",
    "Criteria draft": "条件草稿",
    "Applied criteria": "已应用条件",
    Results: "结果",
    "{0} projects": "{0} 个项目",
    "No projects match the applied criteria.": "没有项目符合已应用的条件。",
    "Draft changed. Results stay on the applied criteria until you click Search.":
      "草稿已更改。在点击“搜索”之前，结果仍使用已应用的条件。",
    "Applied results stay until the next edit in instant mode.":
      "即时模式下，已应用的结果会保持到下一次编辑。",
  },
};

export default messages;
