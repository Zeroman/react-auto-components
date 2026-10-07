# React Auto Components

[English](../../../README.md) | [简体中文](../zh-CN/README.md) | [繁體中文](../zh-TW/README.md) | [日本語](../ja/README.md) | [한국어](../ko/README.md) | [Español](../es/README.md) | [Français](../fr/README.md) | [Deutsch](../de/README.md) | **Português (Brasil)** | [Русский](../ru/README.md)

Uma biblioteca de componentes independente e orientada a esquemas para React 19, com formulários, tabelas e chat. Construída com TypeScript, TanStack Table 9 / Form / Virtual, Radix e Floating UI, sem Ant Design, Element Plus ou MUI. Os builds da biblioteca usam React Compiler.

[![Auto Studio Demonstração](../../assets/demo.png)](https://zeroman.github.io/react-auto-components/)

<p align="center">
  <a href="https://zeroman.github.io/react-auto-components/"><strong>🚀 Demonstração Online (GitHub Pages)</strong></a> · <a href="#executar-o-projeto-de-testes-independente">Executar Localmente</a> · <a href="#componentes">Componentes</a>
</p>

## Estado do projeto

A versão atual é 0.4.1 e as APIs ainda podem mudar. O React 19 é necessário. O pacote fornece declarações ESM e TypeScript. O texto integrado da interface tem como padrão o inglês e pode ser traduzido por meio de AutoConfigProvider.config.t.

Instale com `pnpm add @zeroman.yang/react-auto-components` (npm e yarn funcionam da mesma forma). As peer dependencies são React 19 e react-dom 19. Importe a folha de estilo uma vez: `import "@zeroman.yang/react-auto-components/style.css"`.

Importe uma vez na entrada do aplicativo `import "@zeroman.yang/react-auto-components/style.css"`. Sem a folha de estilos, o modo de desenvolvimento avisa com `RAC-CSS-MISSING`.

Na exportação XLSX, `RAC-TABLE-XLSX` indica que falta o adaptador `exportXlsx`; `RAC-XLSX-DEP` indica que não foi possível carregar a dependência opcional `exceljs`. Importe e passe o adaptador de `@zeroman.yang/react-auto-components/xlsx`; instale com `pnpm add exceljs` quando necessário. CSV e JSON não precisam dele.

- [Demonstração Online (GitHub Pages)](https://zeroman.github.io/react-auto-components/)
- [Como contribuir](https://github.com/Zeroman/react-auto-components/blob/main/docs/i18n/pt-BR/CONTRIBUTING.md)
- [Histórico de alterações](https://github.com/Zeroman/react-auto-components/blob/main/docs/i18n/pt-BR/CHANGELOG.md)
- [Configuração da conta e publicação](https://github.com/Zeroman/react-auto-components/blob/main/docs/i18n/pt-BR/publishing.md)
- [Licença MIT](../../../LICENSE)

## Executar o projeto de testes independente

Requer Node.js >= 22.12 e pnpm 12.5.

```sh
pnpm install --frozen-lockfile
pnpm prepare:test-project
pnpm --dir test-project dev
```

Abra http://127.0.0.1:4173. O projeto de testes inclui páginas para todos os sete componentes, tabelas locais/no servidor/com 10.000 linhas/em árvore, CRUD, novas tentativas de envios com falha, rascunhos, abas aninhadas e alturas de linha dinâmicas.

A demonstração detecta automaticamente o idioma do navegador, com o inglês como fallback. Escolha um idioma no cabeçalho ou nas Configurações globais; a seleção é lembrada entre recarregamentos da página. Selecione Auto para seguir novamente o navegador. Dez idiomas são suportados. As páginas preenchem a viewport, com tabelas e painéis longos rolando dentro de suas próprias áreas.

Cada página de exemplo inclui um botão **Ver código** que abre seu arquivo-fonte real em um diálogo, com abas de arquivos, cópia em um clique e link para o GitHub.

`test-project` tem seus próprios arquivos package.json e de lock. Ele instala a saída real de `pnpm pack`, sem aliases para o código-fonte. Execute `pnpm prepare:test-project` novamente após alterar a biblioteca; o script usa nomes de arquivo com hash do conteúdo para evitar caches de arquivos tarball desatualizados.

## Uso

```tsx
import { useState } from 'react';
import {
  AutoConfigProvider, AutoDialogProvider, AutoTable,
  type AutoColumn, type Field,
} from '@zeroman.yang/react-auto-components';
import '@zeroman.yang/react-auto-components/style.css';

type Person = { id: number; name: string; enabled: boolean };
const columns: AutoColumn<Person>[] = [
  { key: 'name', label: 'Nome', sortable: true },
  { key: 'enabled', label: 'Ativado', options: [
    { label: 'Sim', value: true }, { label: 'Não', value: false },
  ] },
];
const fields: Field<Person>[] = [
  { name: 'name', label: 'Nome', required: true },
  { name: 'enabled', label: 'Ativado', type: 'switch', defaultValue: true },
];
export function App() {
  const [rows, setRows] = useState<Person[]>([]);
  return <AutoConfigProvider config={{ namespace: 'my-app' }}>
    <AutoDialogProvider>
      <AutoTable<Person> id="people" rowKey="id" data={rows}
        columns={columns} formFields={fields} searchFields={fields}
        onAdd={value => setRows(old => [...old, { ...value, id: Date.now() }])}
        onEdit={(row, value) => setRows(old => old.map(item => item.id === row.id ? { ...row, ...value } : item))}
        onDelete={selected => setRows(old => old.filter(item => !selected.some(row => row.id === item.id)))}
      />
    </AutoDialogProvider>
  </AutoConfigProvider>;
}
```

Campos, colunas e referências usam genéricos: nomes de campo ou valores padrão inválidos geram erros em tempo de compilação. O provedor oferece suporte a namespaces, permissões, tradução de rótulos de campos, campos personalizados, notificações e adaptadores de persistência. Rótulos integrados, mensagens de validação e textos de acessibilidade usam AutoConfigProvider.config.t; rótulos explícitos de componentes têm precedência.

O callback t recebe uma chave de mensagem e um fallback. Preserve os placeholders numerados, como {0} e {1}, nas mensagens integradas traduzidas; os componentes substituem seus valores após a tradução.

## Componentes

| Componente | Recursos |
| --- | --- |
| AutoForm | Tipos de campo nativos, opções virtualizadas, seleção em cascata, adaptadores de upload, renderização personalizada, campos dependentes, visibilidade condicional, validação assíncrona, estado controlado e preservação dos dados preenchidos após falhas |
| AutoSearch | Condições básicas/avançadas, busca manual/instantânea, redefinição, etiquetas de ordenação, AST de consulta compartilhada e serialização RSQL |
| AutoTable | Dados locais/remotos, ordenação por várias colunas, filtros de coluna, paginação, seleção estável, virtualização, expansão de árvores/detalhes, resumos, células mescladas, CRUD, menus de contexto e cópia |
| AutoDialog | APIs declarativas/imperativas, provedores isolados, rascunhos, proteção de fechamento, gerenciamento de foco, arraste, tela cheia e envio assíncrono |
| AutoTabs | Layouts horizontal/vertical, aninhamento, permissões, abas desabilitadas, preservação do estado dos painéis e atualização |
| AutoMenu | Navegação lateral com ícones, descrições, badges, grupos aninhados, permissões e uma barra de ícones recolhível |
| AutoChat | Renderização de mensagens controlada pelo chamador, virtualização opcional, acompanhamento de streaming, carregamento de histórico ancorado, compositor com envio/parada e ações personalizadas |

Layout da tabela, ordenação, filtragem e exportação oferecem, cada um, predefinições nomeadas e versões independentes. A persistência usa localStorage por padrão; adaptadores remotos podem ser injetados. A exportação JSON/CSV é integrada. XLSX usa um adaptador opcional separado:

```tsx
import { exportXlsx } from '@zeroman.yang/react-auto-components/xlsx';
// <AutoTable ... exportXlsx={exportXlsx} />
```

ExcelJS é carregado dinamicamente no primeiro uso do adaptador e fica fora do ponto de entrada principal da biblioteca. Aplicações que usam apenas CSV/JSON podem omitir as dependências opcionais durante a instalação.

## Verificação

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm prepare:test-project
pnpm --dir test-project build
pnpm exec playwright install chromium  # Somente na primeira execução
pnpm test:e2e
```

Os testes unitários cobrem campos, validação assíncrona, consultas, diálogos, virtualização, tabelas, migrações de configuração e exportações. Os testes Playwright verificam interações por meio dos pontos de entrada públicos do pacote. Capturas de tela de desktop e dispositivos móveis são gravadas em `test-project/test-results`.

## Comportamento e convenções

- Esta é uma API nativa do React, não uma camada de compatibilidade com Vue propriedade por propriedade ou método por método. Consulte o [guia de migração](migration.md).
- O código da aplicação é responsável pelos dados. Os callbacks de CRUD persistem as alterações; lançar uma exceção em caso de falha preserva as edições. Após o sucesso, o componente atualiza os dados remotos. Os dados locais devem ser atualizados por quem o utiliza.
- O `id` de uma tabela deve ser único em seu namespace, e `rowKey` deve ser único em todas as páginas e nós da árvore. No modo de servidor, forneça `columns` explicitamente; a fonte de dados retorna a contagem total.
- Quando `query` / `value` são controlados, o componente pai deve tratar os callbacks e atualizar o valor. Essas propriedades podem ser omitidas para uso não controlado.
- As células mescladas usam uma tabela semântica não virtualizada, adequada a dados paginados, para evitar desalinhamento de rowSpan entre janelas virtuais.
- Os resumos do servidor para todas as linhas filtradas são fornecidos por `summaryValues`. Resumos ausentes exibem `—` em vez de apresentar o total da página atual como total geral. Defina `summaryScope="page"` para calcular explicitamente a página atual.
- O envio é pausado enquanto uploads estão em andamento. Redefinir ou substituir os valores dos campos, ou desmontar o componente, cancela os uploads antigos; resultados atrasados não podem sobrescrever valores mais recentes.
- Exportações remotas de todos os resultados filtrados solicitam os dados uma página por vez. Aplicações grandes podem implementar sua própria exportação no servidor.
- Importe explicitamente os estilos do navegador de `style.css`. Os módulos JavaScript podem ser importados no Node sem `window`.

## Preencher a altura restante com AutoTable

`height={440}` continua definindo uma altura fixa para a área de rolagem dos dados. Com `height="auto"`, a tabela inteira preenche a altura alocada pelo layout do elemento pai. Busca, barra de ferramentas e paginação mantêm suas alturas naturais; a área de dados usa o espaço restante e tem rolagem independente:

```tsx
<div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', gap: 12 }}>
  <header>Título e descrição da página</header>
  <AutoTable<Person> id="people" rowKey="id" data={rows}
    columns={columns} height="auto" />
  <footer>Rodapé da página</footer>
</div>
```

O elemento pai deve ter uma altura definida. Use `flex: 1; min-height: 0` em contêineres flex aninhados para repassar o espaço restante, ou `grid-template-rows: auto minmax(0, 1fr) auto` em layouts de grade. Não é necessário calcular em JavaScript a altura da janela menos a altura da barra de ferramentas: o layout lida com a adição e remoção de campos de busca, barras de ferramentas em várias linhas e redimensionamento do elemento pai; a lista virtual acompanha as dimensões reais da área de rolagem.

Isso não dimensiona a tabela de acordo com o número de linhas. Conjuntos de dados vazios ou pequenos continuam preenchendo o espaço disponível. O elemento pai deve acomodar, no mínimo, a própria área de busca, a barra de ferramentas e a paginação.

O projeto de testes demonstra esse comportamento na aba **AutoTable → Altura restante**, preservando a barra lateral e o cabeçalho da página. A URL legada `http://127.0.0.1:4173/?demo=auto-height` seleciona essa aba diretamente. Testes de navegador: `test-project/tests/auto-height.spec.ts`.

## Layout global de formulários

Use `AutoConfigProvider.config.form` para configurar de forma consistente formulários comuns, painéis de busca, áreas de busca de tabelas e formulários de diálogos. Os rótulos podem aparecer acima ou à esquerda dos controles, com alinhamento de texto à esquerda/direita independente. O padrão é usar rótulos acima e espaçamento confortável.

```tsx
<AutoConfigProvider config={{
  form: {
    labelPosition: 'left', // 'top': acima; 'left': à esquerda do controle
    labelAlign: 'right',   // Texto alinhado à direita; o rótulo fica à esquerda do controle
    labelWidth: 80,
    density: 'compact',   // 'comfortable': mais espaçamento
  },
}}>
  <App />
</AutoConfigProvider>
```

Provedores aninhados mesclam as configurações de layout propriedade por propriedade. Propriedades explícitas dos componentes prevalecem sobre o provedor que os envolve. Por exemplo, mantenha os rótulos acima em um formulário enquanto usa rótulos na mesma linha globalmente:

```tsx
<AutoForm fields={fields} labelPosition="top" density="comfortable" />
<AutoTable id="people" rowKey="id" data={rows} columns={columns}
  searchFields={searchFields}
  searchLayout={{ labelWidth: 100, columns: 3 }} />
```

`labelWidth` usa `"auto"` por padrão e também aceita um número de pixels ou uma largura CSS, como `"6em"`. No modo automático, cada rótulo de busca se ajusta ao texto; formulários comuns e formulários de diálogos compartilham uma largura baseada nos rótulos visíveis para alinhar os controles. Rótulos longos ocupam no máximo 45% da largura do campo e quebram em mais linhas a partir desse limite, preservando espaço para os controles. Larguras fixas explícitas não estão sujeitas a esse limite automático. Áreas de busca compactas colocam os botões de ação na mesma linha quando há espaço e quebram em mais linhas em telas estreitas. As associações dos rótulos permanecem intactas, erros e descrições se alinham aos controles, e rótulos longos podem quebrar em mais linhas.

Na demonstração, abra **Configurações globais** pela barra lateral ou pela engrenagem no canto superior direito para alterar layout, densidade, largura dos rótulos e tema. As alterações entram em vigor imediatamente sem limpar os dados preenchidos. A página de formulários oferece **Seguir configurações globais** ou substituições locais. A demonstração ativa explicitamente o layout compacto na mesma linha por meio de seu provedor.

## Tamanho e densidade globais

`AutoConfigProvider` oferece suporte a `size: "small" | "medium" | "large"` e `density: "compact" | "comfortable"`. Propriedades explícitas dos componentes têm prioridade sobre as configurações da categoria do componente, que têm prioridade sobre os valores globais:

```tsx
<AutoConfigProvider config={{
  size: "medium",
  density: "compact",
  form: { labelPosition: "left", labelAlign: "right" },
  table: { density: "compact" },
  tabs: { density: "compact" },
}}>
  <AutoForm fields={fields} size="small" />
</AutoConfigProvider>
```

A densidade da tabela também aceita `normal`. Por padrão, o painel de configurações da tabela segue as configurações globais. Selecionar espaçamento compacto, normal ou confortável substitui a densidade global e é salvo com a predefinição de layout; a propriedade `density` do componente tem a maior prioridade. Tamanhos locais de componentes aninhados se aplicam de forma independente.

Formulários oferecem suporte a `resetLabel`, `extraActions` e `onReset`; painéis de busca oferecem suporte a `searchLabel`, `resetLabel` e `extraActions`; diálogos oferecem suporte a `cancelLabel` e `extraActions`. Os itens de `AutoTabs` podem definir um `badge`, e `AutoTable.empty` personaliza o conteúdo do estado vazio.

### AutoChat

O AutoChat fornece um layout de conversa leve com acompanhamento de streaming, carregamento de histórico e um compositor. Forneça conteúdo React ou renderMessage para a renderização das mensagens; nenhuma dependência extra em tempo de execução é necessária.

[AutoChat API](auto-chat.md)

O que o componente faz se um callback lançar: [AutoForm](auto-form.md), [AutoSearch](auto-search.md), [AutoTable](auto-table.md), [AutoDialog](auto-dialog.md), [AutoTabs](auto-tabs.md), [AutoMenu](auto-menu.md). Códigos de erro para desenvolvedores: [errors.md](errors.md).
