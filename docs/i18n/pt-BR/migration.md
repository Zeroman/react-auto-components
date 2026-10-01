# Guia de integração de componentes

[English](../../migration.md) | [简体中文](../zh-CN/migration.md) | [繁體中文](../zh-TW/migration.md) | [日本語](../ja/migration.md) | [한국어](../ko/migration.md) | [Español](../es/migration.md) | [Français](../fr/migration.md) | [Deutsch](../de/migration.md) | **Português (Brasil)** | [Русский](../ru/migration.md)

Configure componentes por meio de generics do React, callbacks e providers. A tabela a seguir mapeia necessidades comuns de aplicativos para as APIs públicas e exemplos executáveis.

| Caso de uso original | API React | Exemplo executável / teste |
| --- | --- | --- |
| Campos de formulário e v-model | `fields: Field<T>[]`, `value/onChange` ou `defaultValue` | Página de formulários em `test-project/src/examples/FormDemo.tsx`; `tests/form*.test.tsx` |
| Slots e conteúdo acrescentado | `render` do campo, `render/header` da coluna, ReactNode | Páginas de formulários/tabelas |
| Operações na instância do formulário | `ref.validate/reset/getValues/setValue/focus` | `tests/form.test.tsx` |
| Busca, condições relacionadas, RSQL | `buildQuery`, `matchesQuery`, `serializeRsql` | Página de busca; `tests/query.test.ts` |
| Dados locais/remotos de tabelas | `data` ou `dataSource(query,{signal})` | Página de tabelas; `tests/table.test.tsx` |
| Predefinições de layout/filtro/ordenação/exportação | Predefinições independentes no diálogo de configurações, invalidadas separadamente por `versions` | Página de tabelas; `tests/table-settings.test.ts` |
| Árvores, detalhes, resumos, células mescladas | `getChildren/renderExpanded`, `summary/merge` da coluna | Exemplos de árvores e expansão; `tests/table-advanced.test.tsx` |
| Adicionar, editar, excluir | `formFields` e `onAdd/onEdit/onDelete` | Testes de CRUD no navegador |
| Diálogos imperativos | `AutoDialogProvider` + `useAutoDialog().open()` | Página de diálogos; `tests/dialog.test.tsx` |
| Abas e abas aninhadas | Itens de `AutoTabs`, value/onChange, keepMounted | Página de abas; `tests/tabs.test.tsx` |
| Listas de mensagens de chat e UI de conversa | `AutoChat`, `messages`, `onSend`, `renderMessage` | Páginas de chat em `test-project/src/examples/Chat*.tsx`; `tests/chat.test.tsx` |

## Tipos de campo

`input/email/textarea/integer/float/percentage/progress/switch/select/select-v2/radio/checkbox/cascader/autocomplete/date/datetime/daterange/datetimerange/upload/text/title/tip/button/append/custom`.

`select-v2` virtualiza as opções. Intervalos de datas usam dois campos nativos com rótulos separados; `dateValue` escolhe entre strings e timestamps. Campos numéricos permitem estados intermediários de edição; use regras de campo para validar restrições de negócio no envio. `rules` oferece suporte à validação assíncrona, enquanto campos ocultos não passam pela validação. As opções preservam valores numéricos/booleanos em vez de convertê-los em strings.

```tsx
const fields: Field<User>[] = [
  { name: 'name', label: 'Nome', required: true },
  { name: 'note', label: 'Observação', hidden: values => !values.enabled,
    render: ({ value, onChange, disabled }) =>
      <textarea disabled={disabled} value={String(value ?? '')}
        onChange={event => onChange(event.target.value)} /> },
];
```

Consulte os tipos TypeScript exportados para conhecer a API completa. `Field<T>` se vincula às chaves reais de T; itens estruturais, como títulos e dicas, não precisam de uma propriedade de dados.

## Fontes de dados no servidor

```tsx
const dataSource: DataSource<User> = async (query, { signal }) => {
  const response = await fetch('/api/users/search', {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query),
  });
  if (!response.ok) throw new Error('Falha ao carregar');
  return response.json(); // { rows: User[], total: number }
};
```

Os índices de página começam em 0. `sort` é um array ordenado de campos; `filter` é uma árvore estruturada de consulta. Os componentes cancelam solicitações antigas e impedem que respostas atrasadas sobrescrevam consultas mais recentes. Chame `ref.refresh()` da tabela quando condições de negócio externas à closure da fonte de dados mudarem. Mantenha a função da fonte de dados estável para evitar solicitações desnecessárias. A serialização RSQL é apenas um adaptador para backends que a exigem; ela não executa strings de consulta.

## Uploads e persistência da aplicação

O método `upload(files, signal)` de um campo retorna o valor do campo depois que a aplicação salva os arquivos. O componente exibe as falhas de upload; quem o utiliza fornece as URLs de upload, a autenticação e as políticas de armazenamento de objetos.

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

Alterações locais são aplicadas imediatamente; salvamentos remotos são executados em série, com uma opção de nova tentativa após falhas. Ao alterar os formatos das configurações persistidas, use um novo id de tabela ou versão para evitar carregar configurações incompatíveis.
