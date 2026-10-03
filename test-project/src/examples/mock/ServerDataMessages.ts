const messages: Record<string, Record<string, string>> = {
  en: {
    "mock.table.title": "A table configured by the server",
    "mock.table.description":
      "JSON defines columns, search fields, page size and edit permissions. The browser mock filters, sorts by every requested column, and returns one page asynchronously.",
    "mock.table.editable":
      "Edit a row to save to the mock server, then refresh or filter to see the updated response. Shift-click headers to sort by multiple columns.",
    "mock.table.readonly":
      "The server grants read-only access to active projects: budget data and edit actions are omitted.",
    "mock.table.saved":
      "The server accepted your changes. The table has requested a fresh page.",
    "mock.table.exchange": "Table request → page response",
    "mock.search.title": "Search fields and results from the server",
    "mock.search.description":
      "The server supplies field schemas, choices, defaults and a dataset. Each search sends a query to the async browser mock; only the latest response is displayed.",
    "mock.search.fail": "Simulate query failure",
    "mock.search.count": "Server returned {0} records",
    "mock.search.empty": "No server records match this query.",
    "mock.search.exchange": "Search request → result response",
    "mock.chat.title": "Conversation history and replies from the server",
    "mock.chat.description":
      "The server response defines history and composer permission. Sending awaits an async browser mock reply. Stop or switch scenarios to cancel pending replies.",
    "mock.chat.welcome": "Welcome to the project support conversation.",
    "mock.chat.question": "Where can I check project progress?",
    "mock.chat.answer": "Open the project table and use its status filter.",
    "mock.chat.reply": "The mock support server received:",
    "mock.chat.writable":
      "The server allows messages up to {0} characters. Failed sends keep your draft; send again to retry.",
    "mock.chat.readonly":
      "The server returned this conversation as read-only; the composer is hidden.",
    "mock.chat.empty":
      "The server returned no history. Send the first message.",
    "mock.chat.fail": "Fail the next send",
    "mock.chat.sendError":
      "Message not sent. Your draft is preserved; send again to retry.",
    "mock.chat.cancelled": "Send cancelled. Your draft is preserved.",
    "mock.chat.tooLong": "The server allows at most {0} characters.",
    "mock.chat.exchange": "Send request → message response",
  },
  "zh-CN": {
    "mock.table.title": "服务端配置驱动的表格",
    "mock.table.description":
      "JSON 定义列、搜索字段、分页大小和编辑权限。浏览器内的模拟服务异步执行筛选、多列排序和分页，再返回当前页。",
    "mock.table.editable":
      "编辑行并保存到模拟服务，再刷新或筛选以查看更新后的响应。按住 Shift 点击表头可按多列排序。",
    "mock.table.readonly":
      "服务端仅授予进行中项目的只读权限，响应不含预算数据和编辑操作。",
    "mock.table.saved": "服务端已接受修改，表格已重新请求当前页。",
    "mock.table.exchange": "表格请求 → 分页响应",
    "mock.search.title": "服务端返回搜索字段和结果",
    "mock.search.description":
      "服务端提供字段结构、选项、默认值和数据集。每次搜索异步发送查询到浏览器模拟服务，仅显示最后一次请求的响应。",
    "mock.search.fail": "模拟查询失败",
    "mock.search.count": "服务端返回 {0} 条记录",
    "mock.search.empty": "服务端没有符合该查询的记录。",
    "mock.search.exchange": "搜索请求 → 结果响应",
    "mock.chat.title": "服务端返回会话历史和回复",
    "mock.chat.description":
      "响应决定历史消息和输入权限。发送消息后等待浏览器模拟服务异步回复。停止或切换场景可取消未完成的回复。",
    "mock.chat.welcome": "欢迎进入项目支持会话。",
    "mock.chat.question": "在哪里查看项目进度？",
    "mock.chat.answer": "打开项目表格并使用状态筛选。",
    "mock.chat.reply": "模拟支持服务已收到：",
    "mock.chat.writable":
      "服务端允许发送不超过 {0} 个字符的消息。失败后保留草稿，再次发送即可重试。",
    "mock.chat.readonly": "服务端返回只读会话，输入框已隐藏。",
    "mock.chat.empty": "服务端未返回历史记录，可以发送第一条消息。",
    "mock.chat.fail": "下次发送失败",
    "mock.chat.sendError": "发送未成功，草稿已保留，请再次发送以重试。",
    "mock.chat.cancelled": "发送已取消，草稿已保留。",
    "mock.chat.tooLong": "服务端最多允许 {0} 个字符。",
    "mock.chat.exchange": "发送请求 → 消息响应",
  },
};
export default messages;
