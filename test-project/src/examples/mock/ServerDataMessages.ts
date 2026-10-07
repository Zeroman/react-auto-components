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
    "mock.table.job": "What the mock server owns",
    "mock.table.query": "Run the query",
    "mock.table.schema": "Send the table",
    "mock.table.queryHelp":
      "The columns are written in this page. Sorting, filtering, and paging ask the mock server, which returns one page. The request is below the table.",
    "mock.table.schemaHelp":
      "The mock server sends the columns, search fields, page size, and whether editing is allowed. Each query then asks it for one page. Switch the response to see a restricted, empty, or failed payload.",
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
    "mock.table.job": "模拟服务负责什么",
    "mock.table.query": "只执行查询",
    "mock.table.schema": "下发表格",
    "mock.table.queryHelp":
      "列写在这个页面里。排序、筛选和翻页都向模拟服务要一页数据，表格下方是发出的请求。",
    "mock.table.schemaHelp":
      "模拟服务下发列、搜索字段、每页条数，以及能不能编辑。之后每次查询再向它要一页。可以切换受限、空数据和失败的响应。",
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
  "zh-TW": {
    "mock.table.title": "伺服端分頁表格",
    "mock.table.description": "編輯列並儲存到模擬服務，再重新整理或篩選以檢視更新後的回應。按住 Shift 點擊表頭可按多欄排序。",
    "mock.table.editable": "編輯一列並儲存到模擬伺服端，再重新整理或篩選以查看更新後的回應。按住 Shift 點擊表頭可按多欄排序。",
    "mock.table.readonly": "伺服端僅授予進行中專案的唯讀權限，回應不含預算資料和編輯操作。",
    "mock.table.saved": "伺服端已接受修改，表格已重新請求目前頁。",
    "mock.table.exchange": "表格請求 → 分頁回應",
    "mock.table.job": "模擬服務負責什麼",
    "mock.table.query": "只執行查詢",
    "mock.table.schema": "下發表格",
    "mock.table.queryHelp": "欄寫在這個頁面裡。排序、篩選和翻頁都向模擬服務要一頁資料，表格下方是發出的請求。",
    "mock.table.schemaHelp": "模擬服務下發欄、搜尋欄位、每頁筆數，以及能不能編輯。之後每次查詢再向它要一頁。可以切換受限、空資料和失敗的回應。",
    "mock.search.title": "伺服端回傳搜尋欄位和結果",
    "mock.search.description": "伺服端提供欄位結構、選項、預設值和資料集。每次搜尋非同步傳送查詢到瀏覽器模擬服務，僅顯示最後一次請求的回應。",
    "mock.search.fail": "模擬查詢失敗",
    "mock.search.count": "伺服端回傳 {0} 筆紀錄",
    "mock.search.empty": "伺服端沒有符合該查詢的紀錄。",
    "mock.search.exchange": "搜尋請求 → 結果回應",
    "mock.chat.title": "伺服端回傳會話歷史和回覆",
    "mock.chat.description": "回應決定歷史訊息和輸入權限。傳送訊息後等待瀏覽器模擬服務非同步回覆。停止或切換場景可取消未完成的回覆。",
    "mock.chat.welcome": "歡迎進入專案支援會話。",
    "mock.chat.question": "在哪裡查看專案進度？",
    "mock.chat.answer": "開啟專案表格並使用其狀態篩選。",
    "mock.chat.reply": "模擬支援服務已收到：",
    "mock.chat.writable": "伺服端允許傳送不超過 {0} 個字元的訊息。失敗後保留草稿，再次傳送即可重試。",
    "mock.chat.readonly": "伺服端回傳唯讀會話，輸入框已隱藏。",
    "mock.chat.empty": "伺服端未回傳歷史紀錄，可以傳送第一則訊息。",
    "mock.chat.fail": "下次傳送失敗",
    "mock.chat.sendError": "傳送未成功，草稿已保留，請再次傳送以重試。",
    "mock.chat.cancelled": "傳送已取消，草稿已保留。",
    "mock.chat.tooLong": "伺服端最多允許 {0} 個字元。",
    "mock.chat.exchange": "傳送請求 → 訊息回應",
  },
  ja: {
    "mock.table.title": "サーバー駆動のページネーションテーブル",
    "mock.table.description":
      "行を編集してモックサーバーに保存し、更新または絞り込みで応答を確認します。Shift を押しながらヘッダーをクリックすると複数列でソートできます。",
    "mock.table.editable":
      "行を編集してモックサーバーに保存し、更新または絞り込みで更新後の応答を確認します。Shift を押しながらヘッダーをクリックすると複数列でソートできます。",
    "mock.table.readonly": "サーバーは進行中プロジェクトへの読み取り専用アクセスを付与します。予算データと編集操作は省略されます。",
    "mock.table.saved": "サーバーが変更を受け入れました。テーブルは現在のページを再要求しました。",
    "mock.table.exchange": "テーブル要求 → ページ応答",
    "mock.table.job": "モックサーバーの役割",
    "mock.table.query": "クエリのみ実行",
    "mock.table.schema": "テーブルを送信",
    "mock.table.queryHelp":
      "列はこのページに書かれています。並べ替え・絞り込み・ページングはモックサーバーに 1 ページを要求し、テーブル下にリクエストが表示されます。",
    "mock.table.schemaHelp":
      "モックサーバーが列、検索フィールド、ページサイズ、編集可否を送ります。その後の各クエリで 1 ページを要求します。制限・空・失敗の応答に切り替えられます。",
    "mock.search.title": "サーバーからの検索フィールドと結果",
    "mock.search.description":
      "サーバーがフィールド構造、選択肢、既定値、データセットを提供します。各検索はブラウザのモックへ非同期でクエリを送り、最新の応答のみ表示します。",
    "mock.search.fail": "クエリ失敗をシミュレート",
    "mock.search.count": "サーバーが {0} 件を返しました",
    "mock.search.empty": "このクエリに一致するサーバーレコードはありません。",
    "mock.search.exchange": "検索要求 → 結果応答",
    "mock.chat.title": "サーバーからの会話履歴と返信",
    "mock.chat.description": "応答が履歴と入力権限を決めます。送信後、ブラウザのモック非同期返信を待ちます。停止またはシナリオ切替で保留中の返信をキャンセルできます。",
    "mock.chat.welcome": "プロジェクトサポートの会話へようこそ。",
    "mock.chat.question": "プロジェクトの進捗はどこで確認できますか？",
    "mock.chat.answer": "プロジェクトテーブルを開き、状態フィルターを使います。",
    "mock.chat.reply": "モックサポートサーバーが受信しました：",
    "mock.chat.writable": "サーバーは最大 {0} 文字のメッセージを許可します。失敗時は下書きが残り、再送信で再試行できます。",
    "mock.chat.readonly": "サーバーはこの会話を読み取り専用として返しました。入力欄は非表示です。",
    "mock.chat.empty": "サーバーは履歴を返しませんでした。最初のメッセージを送信してください。",
    "mock.chat.fail": "次の送信を失敗させる",
    "mock.chat.sendError": "送信できませんでした。下書きは保持されています。再送信して再試行してください。",
    "mock.chat.cancelled": "送信をキャンセルしました。下書きは保持されています。",
    "mock.chat.tooLong": "サーバーは最大 {0} 文字まで許可します。",
    "mock.chat.exchange": "送信要求 → メッセージ応答",
  },
  ko: {
    "mock.table.title": "서버 주도 페이지 테이블",
    "mock.table.description":
      "행을 편집해 모의 서버에 저장한 뒤 새로고침하거나 필터하여 갱신된 응답을 확인하세요. Shift를 누른 채 헤더를 클릭하면 다중 열 정렬이 됩니다.",
    "mock.table.editable":
      "행을 편집해 모의 서버에 저장한 뒤 새로고침하거나 필터하여 갱신된 응답을 확인하세요. Shift를 누른 채 헤더를 클릭하면 다중 열 정렬이 됩니다.",
    "mock.table.readonly": "서버는 진행 중 프로젝트에 읽기 전용 접근만 부여하며 예산 데이터와 편집 작업은 생략됩니다.",
    "mock.table.saved": "서버가 변경을 수락했습니다. 테이블이 현재 페이지를 다시 요청했습니다.",
    "mock.table.exchange": "테이블 요청 → 페이지 응답",
    "mock.table.job": "모의 서버가 담당하는 일",
    "mock.table.query": "쿼리만 실행",
    "mock.table.schema": "테이블 전송",
    "mock.table.queryHelp":
      "열은 이 페이지에 작성되어 있습니다. 정렬·필터·페이징은 모의 서버에 한 페이지를 요청하며, 요청은 테이블 아래에 표시됩니다.",
    "mock.table.schemaHelp":
      "모의 서버가 열, 검색 필드, 페이지 크기, 편집 가능 여부를 보냅니다. 이후 각 쿼리에서 한 페이지를 요청합니다. 제한·빈·실패 응답으로 전환할 수 있습니다.",
    "mock.search.title": "서버에서 온 검색 필드와 결과",
    "mock.search.description":
      "서버가 필드 구조, 선택지, 기본값, 데이터셋을 제공합니다. 각 검색은 브라우저 모의 서비스로 비동기 쿼리를 보내며 최신 응답만 표시합니다.",
    "mock.search.fail": "쿼리 실패 시뮬레이션",
    "mock.search.count": "서버가 {0}건을 반환했습니다",
    "mock.search.empty": "이 쿼리와 일치하는 서버 레코드가 없습니다.",
    "mock.search.exchange": "검색 요청 → 결과 응답",
    "mock.chat.title": "서버에서 온 대화 기록과 응답",
    "mock.chat.description":
      "응답이 기록과 입력 권한을 결정합니다. 전송 후 브라우저 모의 서비스의 비동기 응답을 기다립니다. 중지하거나 시나리오를 바꾸면 대기 중인 응답을 취소할 수 있습니다.",
    "mock.chat.welcome": "프로젝트 지원 대화에 오신 것을 환영합니다.",
    "mock.chat.question": "프로젝트 진행 상황은 어디서 확인하나요?",
    "mock.chat.answer": "프로젝트 테이블을 열고 상태 필터를 사용하세요.",
    "mock.chat.reply": "모의 지원 서버가 수신했습니다:",
    "mock.chat.writable": "서버는 최대 {0}자 메시지를 허용합니다. 실패 시 초안이 유지되며 다시 보내 재시도할 수 있습니다.",
    "mock.chat.readonly": "서버가 이 대화를 읽기 전용으로 반환했으며 입력창이 숨겨져 있습니다.",
    "mock.chat.empty": "서버가 기록을 반환하지 않았습니다. 첫 메시지를 보내세요.",
    "mock.chat.fail": "다음 전송 실패",
    "mock.chat.sendError": "전송에 실패했습니다. 초안이 유지되었으니 다시 보내 재시도하세요.",
    "mock.chat.cancelled": "전송이 취소되었습니다. 초안이 유지됩니다.",
    "mock.chat.tooLong": "서버는 최대 {0}자까지 허용합니다.",
    "mock.chat.exchange": "전송 요청 → 메시지 응답",
  },
  es: {
    "mock.table.title": "Tabla paginada del servidor",
    "mock.table.description":
      "Edite filas y guárdelas en el servidor simulado; luego actualice o filtre para ver la respuesta actualizada. Mantenga Shift y haga clic en los encabezados para ordenar por varias columnas.",
    "mock.table.editable":
      "Edite una fila para guardarla en el servidor mock; luego actualice o filtre para ver la respuesta actualizada. Mantenga Shift y haga clic en los encabezados para ordenar por varias columnas.",
    "mock.table.readonly":
      "El servidor concede acceso de solo lectura a proyectos activos: se omiten los datos de presupuesto y las acciones de edición.",
    "mock.table.saved": "El servidor aceptó los cambios. La tabla ha solicitado una página nueva.",
    "mock.table.exchange": "Solicitud de tabla → respuesta de página",
    "mock.table.job": "Qué posee el servidor mock",
    "mock.table.query": "Ejecutar la consulta",
    "mock.table.schema": "Enviar la tabla",
    "mock.table.queryHelp":
      "Las columnas se escriben en esta página. Ordenar, filtrar y paginar piden una página al servidor mock; la solicitud está debajo de la tabla.",
    "mock.table.schemaHelp":
      "El servidor mock envía columnas, campos de búsqueda, tamaño de página y si se permite editar. Cada consulta luego pide una página. Cambie la respuesta para ver un payload restringido, vacío o fallido.",
    "mock.search.title": "Campos de búsqueda y resultados del servidor",
    "mock.search.description":
      "El servidor suministra esquemas de campos, opciones, valores predeterminados y un conjunto de datos. Cada búsqueda envía una consulta al mock asíncrono del navegador; solo se muestra la última respuesta.",
    "mock.search.fail": "Simular fallo de consulta",
    "mock.search.count": "El servidor devolvió {0} registros",
    "mock.search.empty": "Ningún registro del servidor coincide con esta consulta.",
    "mock.search.exchange": "Solicitud de búsqueda → respuesta de resultado",
    "mock.chat.title": "Historial y respuestas del servidor",
    "mock.chat.description":
      "La respuesta define el historial y el permiso del compositor. Al enviar se espera una respuesta asíncrona del mock del navegador. Detener o cambiar de escenario cancela las respuestas pendientes.",
    "mock.chat.welcome": "Bienvenido a la conversación de soporte del proyecto.",
    "mock.chat.question": "¿Dónde puedo comprobar el progreso del proyecto?",
    "mock.chat.answer": "Abra la tabla de proyectos y use su filtro de estado.",
    "mock.chat.reply": "El servidor de soporte mock recibió:",
    "mock.chat.writable":
      "El servidor permite mensajes de hasta {0} caracteres. Si falla el envío, se conserva el borrador; envíe de nuevo para reintentar.",
    "mock.chat.readonly":
      "El servidor devolvió esta conversación como de solo lectura; el compositor está oculto.",
    "mock.chat.empty": "El servidor no devolvió historial. Envíe el primer mensaje.",
    "mock.chat.fail": "Fallar el próximo envío",
    "mock.chat.sendError":
      "Mensaje no enviado. Se conserva el borrador; envíe de nuevo para reintentar.",
    "mock.chat.cancelled": "Envío cancelado. Se conserva el borrador.",
    "mock.chat.tooLong": "El servidor permite como máximo {0} caracteres.",
    "mock.chat.exchange": "Solicitud de envío → respuesta de mensaje",
  },
  fr: {
    "mock.table.title": "Tableau paginé côté serveur",
    "mock.table.description":
      "Modifiez des lignes et enregistrez-les sur le serveur simulé, puis actualisez ou filtrez pour voir la réponse mise à jour. Maintenez Maj et cliquez sur les en-têtes pour trier sur plusieurs colonnes.",
    "mock.table.editable":
      "Modifiez une ligne pour l’enregistrer sur le serveur mock, puis actualisez ou filtrez pour voir la réponse mise à jour. Maintenez Maj et cliquez sur les en-têtes pour trier sur plusieurs colonnes.",
    "mock.table.readonly":
      "Le serveur accorde un accès en lecture seule aux projets actifs : les données budgétaires et les actions d’édition sont omises.",
    "mock.table.saved":
      "Le serveur a accepté vos modifications. Le tableau a demandé une page à jour.",
    "mock.table.exchange": "Requête tableau → réponse de page",
    "mock.table.job": "Ce que possède le serveur mock",
    "mock.table.query": "Exécuter la requête",
    "mock.table.schema": "Envoyer le tableau",
    "mock.table.queryHelp":
      "Les colonnes sont écrites dans cette page. Tri, filtrage et pagination demandent une page au serveur mock ; la requête est sous le tableau.",
    "mock.table.schemaHelp":
      "Le serveur mock envoie colonnes, champs de recherche, taille de page et l’autorisation d’édition. Chaque requête demande ensuite une page. Basculez la réponse pour un payload restreint, vide ou en échec.",
    "mock.search.title": "Champs de recherche et résultats du serveur",
    "mock.search.description":
      "Le serveur fournit schémas de champs, choix, valeurs par défaut et un jeu de données. Chaque recherche envoie une requête au mock asynchrone du navigateur ; seule la dernière réponse s’affiche.",
    "mock.search.fail": "Simuler un échec de requête",
    "mock.search.count": "Le serveur a renvoyé {0} enregistrements",
    "mock.search.empty": "Aucun enregistrement serveur ne correspond à cette requête.",
    "mock.search.exchange": "Requête de recherche → réponse de résultat",
    "mock.chat.title": "Historique et réponses du serveur",
    "mock.chat.description":
      "La réponse définit l’historique et l’autorisation du compositeur. L’envoi attend une réponse asynchrone du mock navigateur. Arrêter ou changer de scénario annule les réponses en attente.",
    "mock.chat.welcome": "Bienvenue dans la conversation d’assistance projet.",
    "mock.chat.question": "Où puis-je vérifier l’avancement du projet ?",
    "mock.chat.answer": "Ouvrez le tableau des projets et utilisez son filtre d’état.",
    "mock.chat.reply": "Le serveur d’assistance mock a reçu :",
    "mock.chat.writable":
      "Le serveur autorise des messages jusqu’à {0} caractères. En cas d’échec, le brouillon est conservé ; renvoyez pour réessayer.",
    "mock.chat.readonly":
      "Le serveur a renvoyé cette conversation en lecture seule ; le compositeur est masqué.",
    "mock.chat.empty": "Le serveur n’a renvoyé aucun historique. Envoyez le premier message.",
    "mock.chat.fail": "Faire échouer le prochain envoi",
    "mock.chat.sendError":
      "Message non envoyé. Votre brouillon est conservé ; renvoyez pour réessayer.",
    "mock.chat.cancelled": "Envoi annulé. Votre brouillon est conservé.",
    "mock.chat.tooLong": "Le serveur autorise au plus {0} caractères.",
    "mock.chat.exchange": "Requête d’envoi → réponse de message",
  },
  de: {
    "mock.table.title": "Serverseitig paginierte Tabelle",
    "mock.table.description":
      "Bearbeiten Sie Zeilen und speichern Sie sie auf dem Mock-Server; aktualisieren oder filtern Sie dann, um die aktualisierte Antwort zu sehen. Umschalt gedrückt halten und auf Kopfzeilen klicken für Mehrspalten-Sortierung.",
    "mock.table.editable":
      "Bearbeiten Sie eine Zeile, speichern Sie auf dem Mock-Server, und aktualisieren oder filtern Sie, um die aktualisierte Antwort zu sehen. Umschalt gedrückt halten und auf Kopfzeilen klicken für Mehrspalten-Sortierung.",
    "mock.table.readonly":
      "Der Server gewährt nur Lesezugriff auf aktive Projekte: Budgetdaten und Bearbeitungsaktionen entfallen.",
    "mock.table.saved":
      "Der Server hat Ihre Änderungen akzeptiert. Die Tabelle hat eine frische Seite angefordert.",
    "mock.table.exchange": "Tabellenanfrage → Seitenantwort",
    "mock.table.job": "Was der Mock-Server besitzt",
    "mock.table.query": "Abfrage ausführen",
    "mock.table.schema": "Tabelle senden",
    "mock.table.queryHelp":
      "Die Spalten stehen auf dieser Seite. Sortieren, Filtern und Paginieren fordern eine Seite vom Mock-Server an; die Anfrage steht unter der Tabelle.",
    "mock.table.schemaHelp":
      "Der Mock-Server sendet Spalten, Suchfelder, Seitengröße und ob Bearbeiten erlaubt ist. Jede Abfrage holt dann eine Seite. Wechseln Sie die Antwort für eingeschränkt, leer oder fehlgeschlagen.",
    "mock.search.title": "Suchfelder und Ergebnisse vom Server",
    "mock.search.description":
      "Der Server liefert Feldschemas, Auswahlwerte, Standardwerte und einen Datensatz. Jede Suche sendet eine Abfrage an den asynchronen Browser-Mock; nur die neueste Antwort wird angezeigt.",
    "mock.search.fail": "Abfragefehler simulieren",
    "mock.search.count": "Server gab {0} Datensätze zurück",
    "mock.search.empty": "Keine Serverdatensätze passen zu dieser Abfrage.",
    "mock.search.exchange": "Suchanfrage → Ergebnisantwort",
    "mock.chat.title": "Gesprächsverlauf und Antworten vom Server",
    "mock.chat.description":
      "Die Antwort legt Verlauf und Composer-Recht fest. Nach dem Senden wartet eine asynchrone Browser-Mock-Antwort. Stoppen oder Szenariowechsel bricht ausstehende Antworten ab.",
    "mock.chat.welcome": "Willkommen im Projekt-Support-Gespräch.",
    "mock.chat.question": "Wo kann ich den Projektfortschritt prüfen?",
    "mock.chat.answer": "Öffnen Sie die Projekttabelle und nutzen Sie den Statusfilter.",
    "mock.chat.reply": "Der Mock-Support-Server hat empfangen:",
    "mock.chat.writable":
      "Der Server erlaubt Nachrichten mit höchstens {0} Zeichen. Bei Fehlschlag bleibt der Entwurf; erneut senden zum Wiederholen.",
    "mock.chat.readonly":
      "Der Server gab dieses Gespräch als schreibgeschützt zurück; der Composer ist ausgeblendet.",
    "mock.chat.empty": "Der Server gab keinen Verlauf zurück. Senden Sie die erste Nachricht.",
    "mock.chat.fail": "Nächsten Sendevorgang fehlschlagen lassen",
    "mock.chat.sendError":
      "Nachricht nicht gesendet. Entwurf bleibt erhalten; erneut senden zum Wiederholen.",
    "mock.chat.cancelled": "Senden abgebrochen. Entwurf bleibt erhalten.",
    "mock.chat.tooLong": "Der Server erlaubt höchstens {0} Zeichen.",
    "mock.chat.exchange": "Sendeanfrage → Nachrichtenantwort",
  },
  "pt-BR": {
    "mock.table.title": "Tabela paginada do servidor",
    "mock.table.description":
      "Edite linhas e salve no servidor simulado; depois atualize ou filtre para ver a resposta atualizada. Segure Shift e clique nos cabeçalhos para ordenar por várias colunas.",
    "mock.table.editable":
      "Edite uma linha para salvar no servidor mock; depois atualize ou filtre para ver a resposta atualizada. Segure Shift e clique nos cabeçalhos para ordenar por várias colunas.",
    "mock.table.readonly":
      "O servidor concede acesso somente leitura a projetos ativos: dados de orçamento e ações de edição são omitidos.",
    "mock.table.saved":
      "O servidor aceitou suas alterações. A tabela solicitou uma página atualizada.",
    "mock.table.exchange": "Solicitação da tabela → resposta de página",
    "mock.table.job": "O que o servidor mock possui",
    "mock.table.query": "Executar a consulta",
    "mock.table.schema": "Enviar a tabela",
    "mock.table.queryHelp":
      "As colunas são escritas nesta página. Ordenação, filtro e paginação pedem uma página ao servidor mock; a solicitação fica abaixo da tabela.",
    "mock.table.schemaHelp":
      "O servidor mock envia colunas, campos de busca, tamanho da página e se a edição é permitida. Cada consulta então pede uma página. Alterne a resposta para ver payload restrito, vazio ou com falha.",
    "mock.search.title": "Campos de busca e resultados do servidor",
    "mock.search.description":
      "O servidor fornece esquemas de campos, opções, padrões e um conjunto de dados. Cada busca envia uma consulta ao mock assíncrono do navegador; só a última resposta é exibida.",
    "mock.search.fail": "Simular falha da consulta",
    "mock.search.count": "O servidor retornou {0} registros",
    "mock.search.empty": "Nenhum registro do servidor corresponde a esta consulta.",
    "mock.search.exchange": "Solicitação de busca → resposta de resultado",
    "mock.chat.title": "Histórico e respostas do servidor",
    "mock.chat.description":
      "A resposta define o histórico e a permissão do compositor. Ao enviar, aguarda-se uma resposta assíncrona do mock do navegador. Parar ou trocar de cenário cancela respostas pendentes.",
    "mock.chat.welcome": "Bem-vindo à conversa de suporte do projeto.",
    "mock.chat.question": "Onde posso verificar o progresso do projeto?",
    "mock.chat.answer": "Abra a tabela de projetos e use o filtro de status.",
    "mock.chat.reply": "O servidor de suporte mock recebeu:",
    "mock.chat.writable":
      "O servidor permite mensagens de até {0} caracteres. Se o envio falhar, o rascunho é mantido; envie de novo para tentar novamente.",
    "mock.chat.readonly":
      "O servidor retornou esta conversa como somente leitura; o compositor está oculto.",
    "mock.chat.empty": "O servidor não retornou histórico. Envie a primeira mensagem.",
    "mock.chat.fail": "Falhar o próximo envio",
    "mock.chat.sendError":
      "Mensagem não enviada. Seu rascunho foi preservado; envie de novo para tentar novamente.",
    "mock.chat.cancelled": "Envio cancelado. Seu rascunho foi preservado.",
    "mock.chat.tooLong": "O servidor permite no máximo {0} caracteres.",
    "mock.chat.exchange": "Solicitação de envio → resposta de mensagem",
  },
  ru: {
    "mock.table.title": "Постраничная таблица с сервера",
    "mock.table.description":
      "Отредактируйте строки и сохраните на mock-сервере, затем обновите или отфильтруйте, чтобы увидеть обновлённый ответ. Удерживайте Shift и щёлкайте заголовки для сортировки по нескольким столбцам.",
    "mock.table.editable":
      "Отредактируйте строку и сохраните на mock-сервере, затем обновите или отфильтруйте, чтобы увидеть обновлённый ответ. Удерживайте Shift и щёлкайте заголовки для сортировки по нескольким столбцам.",
    "mock.table.readonly":
      "Сервер даёт только чтение активных проектов: бюджет и действия правки опущены.",
    "mock.table.saved": "Сервер принял изменения. Таблица запросила актуальную страницу.",
    "mock.table.exchange": "Запрос таблицы → ответ страницы",
    "mock.table.job": "За что отвечает mock-сервер",
    "mock.table.query": "Выполнить запрос",
    "mock.table.schema": "Отправить таблицу",
    "mock.table.queryHelp":
      "Столбцы заданы на этой странице. Сортировка, фильтр и пагинация запрашивают у mock-сервера одну страницу; запрос — под таблицей.",
    "mock.table.schemaHelp":
      "Mock-сервер отдаёт столбцы, поля поиска, размер страницы и право на правку. Затем каждый запрос просит одну страницу. Переключите ответ на ограниченный, пустой или сбойный.",
    "mock.search.title": "Поля поиска и результаты с сервера",
    "mock.search.description":
      "Сервер отдаёт схемы полей, варианты, значения по умолчанию и набор данных. Каждый поиск асинхронно шлёт запрос в browser-mock; показывается только последний ответ.",
    "mock.search.fail": "Симулировать сбой запроса",
    "mock.search.count": "Сервер вернул записей: {0}",
    "mock.search.empty": "Нет серверных записей по этому запросу.",
    "mock.search.exchange": "Запрос поиска → ответ с результатами",
    "mock.chat.title": "История и ответы с сервера",
    "mock.chat.description":
      "Ответ задаёт историю и право композера. После отправки ждётся асинхронный ответ browser-mock. Остановка или смена сценария отменяет незавершённые ответы.",
    "mock.chat.welcome": "Добро пожаловать в разговор поддержки проекта.",
    "mock.chat.question": "Где посмотреть прогресс проекта?",
    "mock.chat.answer": "Откройте таблицу проектов и используйте фильтр статуса.",
    "mock.chat.reply": "Mock-сервер поддержки получил:",
    "mock.chat.writable":
      "Сервер допускает сообщения до {0} символов. При сбое черновик сохраняется; отправьте снова для повтора.",
    "mock.chat.readonly": "Сервер вернул этот разговор только для чтения; композер скрыт.",
    "mock.chat.empty": "Сервер не вернул историю. Отправьте первое сообщение.",
    "mock.chat.fail": "Сбой следующей отправки",
    "mock.chat.sendError":
      "Сообщение не отправлено. Черновик сохранён; отправьте снова для повтора.",
    "mock.chat.cancelled": "Отправка отменена. Черновик сохранён.",
    "mock.chat.tooLong": "Сервер допускает не более {0} символов.",
    "mock.chat.exchange": "Запрос отправки → ответ сообщения",
  },
};
export default messages;
