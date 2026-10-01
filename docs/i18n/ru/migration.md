# Руководство по интеграции компонентов

[English](../../migration.md) | [简体中文](../zh-CN/migration.md) | [繁體中文](../zh-TW/migration.md) | [日本語](../ja/migration.md) | [한국어](../ko/migration.md) | [Español](../es/migration.md) | [Français](../fr/migration.md) | [Deutsch](../de/migration.md) | [Português (Brasil)](../pt-BR/migration.md) | **Русский**

Настройка компонентов выполняется через React-дженерики, колбэки и провайдеры. Приведённая ниже таблица сопоставляет типовые потребности приложений с публичными API и запускаемыми примерами.

| Исходный сценарий | API React | Исполняемый пример / тест |
| --- | --- | --- |
| Поля формы и v-model | `fields: Field<T>[]`, `value/onChange` или `defaultValue` | Страница формы в `test-project/src/examples/FormDemo.tsx`; `tests/form*.test.tsx` |
| Слоты и добавляемое содержимое | `render` поля, `render/header` столбца, ReactNode | Страницы формы/таблицы |
| Операции экземпляра формы | `ref.validate/reset/getValues/setValue/focus` | `tests/form.test.tsx` |
| Поиск, связанные условия, RSQL | `buildQuery`, `matchesQuery`, `serializeRsql` | Страница поиска; `tests/query.test.ts` |
| Локальные/удалённые данные таблицы | Либо `data`, либо `dataSource(query,{signal})` | Страница таблицы; `tests/table.test.tsx` |
| Наборы настроек компоновки/фильтра/сортировки/экспорта | Независимые наборы в диалоге настроек, отдельно сбрасываемые через `versions` | Страница таблицы; `tests/table-settings.test.ts` |
| Деревья, подробности, итоги, объединённые ячейки | `getChildren/renderExpanded`, `summary/merge` столбца | Примеры деревьев и раскрытия; `tests/table-advanced.test.tsx` |
| Добавление, редактирование, удаление | `formFields` и `onAdd/onEdit/onDelete` | Браузерные тесты CRUD |
| Императивные диалоги | `AutoDialogProvider` + `useAutoDialog().open()` | Страница диалогов; `tests/dialog.test.tsx` |
| Вкладки и вложенные вкладки | Элементы `AutoTabs`, value/onChange, keepMounted | Страница вкладок; `tests/tabs.test.tsx` |
| Списки сообщений чата и интерфейс диалога | `AutoChat`, `messages`, `onSend`, `renderMessage` | Страницы чата в `test-project/src/examples/Chat*.tsx`; `tests/chat.test.tsx` |

## Типы полей

`input/email/textarea/integer/float/percentage/progress/switch/select/select-v2/radio/checkbox/cascader/autocomplete/date/datetime/daterange/datetimerange/upload/text/title/tip/button/append/custom`.

`select-v2` виртуализирует варианты выбора. Диапазоны дат используют два нативных поля ввода с отдельными подписями; `dateValue` выбирает строки или временные метки. Числовые поля допускают промежуточные состояния редактирования; используйте правила полей, чтобы проверять бизнес-ограничения при отправке. `rules` поддерживает асинхронную валидацию, а скрытые поля пропускают проверку. Варианты выбора сохраняют числовые/логические значения, не преобразуя их в строки.

```tsx
const fields: Field<User>[] = [
  { name: 'name', label: 'Имя', required: true },
  { name: 'note', label: 'Примечание', hidden: values => !values.enabled,
    render: ({ value, onChange, disabled }) =>
      <textarea disabled={disabled} value={String(value ?? '')}
        onChange={event => onChange(event.target.value)} /> },
];
```

Полный API приведён в экспортируемых типах TypeScript. `Field<T>` привязывается к реальным ключам T; структурным элементам, таким как заголовки и подсказки, свойство данных не требуется.

## Серверные источники данных

```tsx
const dataSource: DataSource<User> = async (query, { signal }) => {
  const response = await fetch('/api/users/search', {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query),
  });
  if (!response.ok) throw new Error('Не удалось загрузить');
  return response.json(); // { rows: User[], total: number }
};
```

Индексы страниц начинаются с 0. `sort` — упорядоченный массив полей; `filter` — структурированное дерево запроса. Компоненты отменяют старые запросы и не позволяют запоздалым ответам перезаписывать результаты более новых запросов. Вызывайте `ref.refresh()` таблицы, когда изменяются бизнес-условия вне замыкания источника данных. Сохраняйте стабильную ссылку на функцию источника данных, чтобы избежать лишних запросов. Сериализация RSQL — лишь адаптер для серверов, которым она нужна; она не выполняет строки запросов.

## Загрузка файлов и сохранение настроек приложением

Метод поля `upload(files, signal)` возвращает значение поля после того, как приложение сохранит файлы. Компонент отображает ошибки загрузки; вызывающий код предоставляет URL загрузки, аутентификацию и политики объектного хранилища.

```tsx
<AutoConfigProvider config={{
  namespace: 'tenant-admin',
  canAccess: access => !access.permissions?.length || access.permissions.every(p => myPermissions.includes(p)),
  settings: {
    load: key => api.loadTableSettings(key),
    save: (key, settings) => api.saveTableSettings(key, settings),
  },
  notify: (message, level) => showToast(message, level),
}}>{children}</AutoConfigProvider>
```

Локальные изменения применяются сразу; удалённые сохранения выполняются последовательно, с возможностью повторной попытки после сбоя. При изменении форматов сохраняемых настроек используйте новый идентификатор таблицы или новую версию, чтобы избежать загрузки несовместимых настроек.
