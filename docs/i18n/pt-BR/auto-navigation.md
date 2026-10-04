# AutoNavigation e navegação em árvore de componentes

[English](../../auto-navigation.md) | [简体中文](../zh-CN/auto-navigation.md) | **Português (Brasil)**

React Auto Components oferece um sistema de navegação em árvore no qual os próprios componentes participam diretamente da árvore de navegação, desacoplando localização, parâmetros, permissões de acesso e histórico de URL.

---

## Dois níveis de integração

Escolha o nível de integração que melhor corresponde à sua arquitetura:

### Nível 1: integração leve com roteador (sem Provider)

Se seu aplicativo já usa um roteador externo (como React Router, TanStack Router ou Next.js) e apenas precisa que `AutoMenu` ou `AutoTabs` reflitam e controlem as URLs atuais, use diretamente as props controladas padrão `value` e `onChange`:

```tsx
import { AutoMenu, AutoTabs } from "@zeroman.yang/react-auto-components";
import { useLocation, useNavigate } from "react-router-dom";

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  // Strip leading slash to match menu item id
  const currentId = location.pathname.slice(1) || "overview";

  return (
    <AutoMenu
      items={[
        { id: "overview", label: "Overview" },
        { id: "users", label: "Users" },
        { id: "settings", label: "Settings" },
      ]}
      value={currentId}
      onChange={(id) => navigate(`/${id}`)}
    />
  );
}
```

**Quando usar o Nível 1:**

- Alternância de páginas de nível superior gerenciada inteiramente pelo seu roteador externo.
- Sem necessidade de descoberta de localização em árvore de componentes aninhados.
- Sem necessidade de hooks `useAutoRoute` com escopo de componente, sinais de abort ou protocolos de espera de montagem assíncrona preguiçosa.

---

### Nível 2: navegação em árvore de componentes (`AutoNavigation` + adaptador de histórico)

O Nível 2 transforma sua hierarquia de componentes em uma árvore de navegação viva e declarativa. Os destinos de navegação são caminhos estruturados (por exemplo, `workspace:projects:details` ou `["workspace", "projects", "details"]`), os parâmetros ficam desacoplados da estrutura do caminho e a navegação funciona perfeitamente dentro ou fora do React.

```tsx
import { useEffect, useState } from "react";
import { useAutoRoute } from "@zeroman.yang/react-auto-components";

function ProjectDetails() {
  const [data, setData] = useState<unknown>(null);
  const { params, goto, signal, activeChild } = useAutoRoute({
    name: "details",
    defaultChild: "specs",
    children: ["specs", "team", "settings"],
  });

  useEffect(() => {
    if (!params.projectId) return;
    setData(null);
    // signal is automatically aborted if navigation changes or on unmount
    fetch(`/api/projects/${encodeURIComponent(params.projectId)}`, { signal })
      .then((res) => res.json())
      .then(setData)
      .catch((error) => {
        if (!signal.aborted) setData({ error: String(error) });
      });
  }, [params.projectId, signal]);

  return (
    <div>
      <h3>Project: {params.projectId}</h3>
      <pre>{JSON.stringify(data, null, 2)}</pre>
      <button onClick={() => goto("./team")}>View Team</button>
      <button onClick={() => goto("../list")}>Back to List</button>
    </div>
  );
}
```

**Quando usar o Nível 2:**

- Árvores de componentes profundamente aninhadas que exigem navegação relativa (`./child`, `../sibling`).
- Parâmetros desacoplados (`params: { projectId: "42", tab: "audit" }`).
- Montagem assíncrona de componentes preguiçosos na qual o `goto` aguarda o registro do nó filho antes de finalizar a transição.
- Reconciliação de permissões refinada (`canAccess`, `roles`, `permissions`, `disabled`, `hidden`) com correção automática de URL se um destino se tornar proibido ou for desmontado.
- Gerenciamento integrado de `AbortSignal` resiliente à montagem dupla do StrictMode do React 18/19.

---

## Exemplos oficiais de adaptadores para frameworks

Para sincronizar o `AutoNavigation` com um roteador de framework externo (Nível 2), implemente um `AutoHistoryAdapter` com `read()`, `push()`, `replace()` e `subscribe()`.

> **Importante**: o adaptador personalizado deve ler a localização mais recente do roteador por meio de refs para evitar closures obsoletas e não deve reconstruir os listeners de sincronização a cada atualização de localização, para que navegações preguiçosas pendentes nunca sejam interrompidas.

Os effects publicam a URL atual com `onChange(location, { type: "snapshot" })`, incluindo sua execução inicial e o replay do StrictMode. Um snapshot inalterado não interrompe uma navegação pendente de um filho; um snapshot alterado ainda navega, inclusive um retorno à rota previamente confirmada. Use `{ type: "navigation" }` para uma intenção conhecida de navegação externa, mesmo quando sua URL estiver inalterada. Notificações apenas de localização mantêm sua semântica de navegação existente (com detecção de eco de escrita); portanto, adaptadores existentes que reproduzem um snapshot inicial devem adicionar esses metadados ou suprimir essa reprodução por conta própria.

Para uma escrita `void` adiada que foi substituída, a ponte lembra seu destino e corrige uma confirmação tardia de volta para a URL pretendida mais recente. Se o adaptador abandonar completamente essa escrita, um snapshot posterior do mesmo destino não pode ser distinguido de sua confirmação. Publique uma navegação externa conhecida como `{ type: "navigation" }` nesse caso; ela continua sendo autoritativa.

### 1. React Router (v6 / v7)

Integra-se ao React Router usando [useLocation](https://reactrouter.com/api/hooks/useLocation) e [useNavigate](https://reactrouter.com/api/hooks/useNavigate).

Configure seu roteador com uma rota splat / catch-all (por exemplo, `<Route path="workspace/*" element={<App />} />`) para que caminhos de componentes aninhados sejam tratados sem 404 inesperados.

```tsx
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  decodeLocation,
  encodeLocation,
  type AutoHistoryAdapter,
  type AutoHistoryChange,
  type AutoLocation,
} from "@zeroman.yang/react-auto-components";

export function useReactRouterAdapter(basePath = ""): AutoHistoryAdapter {
  const navigate = useNavigate();
  const location = useLocation();

  const locationRef = useRef(location);
  locationRef.current = location;
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const listenersRef = useRef(
    new Set<(location: AutoLocation, change?: AutoHistoryChange) => void>(),
  );

  // decodeLocation only strips basePath on a segment boundary ("/admin" never matches "/administrator").
  const readLocation = useCallback(
    (): AutoLocation =>
      decodeLocation(
        locationRef.current.pathname + locationRef.current.search,
        basePath,
      ),
    [basePath],
  );
  const toUrl = useCallback(
    (loc: AutoLocation) =>
      `/${encodeLocation(loc, basePath, "/").replace(/^\/+/, "")}`,
    [basePath],
  );

  // Notify adapter subscribers whenever the router URL changes (external / back / forward)
  useEffect(() => {
    const nextLoc = readLocation();
    listenersRef.current.forEach((fn) => fn(nextLoc, { type: "snapshot" }));
  }, [location.pathname, location.search, readLocation]);

  return useMemo<AutoHistoryAdapter>(() => {
    return {
      read(): AutoLocation {
        return readLocation();
      },
      push(loc: AutoLocation): void | Promise<void> {
        return navigateRef.current(toUrl(loc), { replace: false });
      },
      replace(loc: AutoLocation): void | Promise<void> {
        return navigateRef.current(toUrl(loc), { replace: true });
      },
      subscribe(
        listener: (location: AutoLocation, change?: AutoHistoryChange) => void,
      ): () => void {
        listenersRef.current.add(listener);
        return () => {
          listenersRef.current.delete(listener);
        };
      },
    };
  }, [readLocation, toUrl]);
}
```

### 2. TanStack Router

Integra-se ao TanStack Router usando [useLocation](https://tanstack.com/router/latest/docs/framework/react/api/router/useLocationHook) e [useNavigate](https://tanstack.com/router/latest/docs/framework/react/api/router/useNavigateHook).

Use uma rota de arquivo catch-all do TanStack (por exemplo, `_layout/$` ou `routes/workspace.$`) para capturar caminhos dinâmicos de componentes.

```tsx
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import {
  decodeLocation,
  encodeLocation,
  type AutoHistoryAdapter,
  type AutoHistoryChange,
  type AutoLocation,
} from "@zeroman.yang/react-auto-components";

export function useTanStackRouterAdapter(basePath = ""): AutoHistoryAdapter {
  const location = useLocation();
  const navigate = useNavigate();

  const locationRef = useRef(location);
  locationRef.current = location;
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const listenersRef = useRef(
    new Set<(location: AutoLocation, change?: AutoHistoryChange) => void>(),
  );

  const readLocation = useCallback((): AutoLocation => {
    const loc = locationRef.current;
    const { path } = decodeLocation(loc.pathname, basePath);
    const params: Record<string, string> = {};
    const search = new URLSearchParams(loc.searchStr);
    search.forEach((value, key) => {
      params[key] = value;
    });
    return { path, params };
  }, [basePath]);
  const toPath = useCallback(
    (loc: AutoLocation) =>
      `/${encodeLocation({ path: loc.path }, basePath, "/").replace(/^\/+/, "")}`,
    [basePath],
  );

  // Notify adapter subscribers on location change
  useEffect(() => {
    const nextLoc = readLocation();
    listenersRef.current.forEach((fn) => fn(nextLoc, { type: "snapshot" }));
  }, [location.pathname, location.searchStr, readLocation]);

  return useMemo<AutoHistoryAdapter>(
    () => ({
      read(): AutoLocation {
        return readLocation();
      },
      push(loc: AutoLocation): Promise<void> {
        return navigateRef.current({
          to: toPath(loc),
          search: loc.params ?? {},
          replace: false,
        });
      },
      replace(loc: AutoLocation): Promise<void> {
        return navigateRef.current({
          to: toPath(loc),
          search: loc.params ?? {},
          replace: true,
        });
      },
      subscribe(
        listener: (location: AutoLocation, change?: AutoHistoryChange) => void,
      ): () => void {
        listenersRef.current.add(listener);
        return () => {
          listenersRef.current.delete(listener);
        };
      },
    }),
    [readLocation, toPath],
  );
}
```

### 3. Next.js App Router ('use client')

Integra-se ao Next.js App Router usando [useRouter](https://nextjs.org/docs/app/api-reference/functions/use-router), [usePathname](https://nextjs.org/docs/app/api-reference/functions/use-pathname) e [useSearchParams](https://nextjs.org/docs/app/api-reference/functions/use-search-params).

> **Observação sobre o Next.js**:
>
> 1. Para rotas do App Router renderizadas estaticamente, envolva o componente cliente que lê `useSearchParams()` em `<Suspense>`; builds de produção exigem essa fronteira. Consulte a documentação do Next.js vinculada para alternativas de renderização dinâmica.
> 2. Defina uma rota catch-all opcional `app/[[...slug]]/page.tsx` para que caminhos de componentes com múltiplos segmentos sejam resolvidos de forma fluida, sem 404s.

```tsx
"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  type AutoHistoryAdapter,
  type AutoHistoryChange,
  type AutoLocation,
} from "@zeroman.yang/react-auto-components";

export function useNextAppRouterAdapter(): AutoHistoryAdapter {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const routerRef = useRef(router);
  routerRef.current = router;
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  const searchParamsRef = useRef(searchParams);
  searchParamsRef.current = searchParams;

  const listenersRef = useRef(
    new Set<(location: AutoLocation, change?: AutoHistoryChange) => void>(),
  );

  const readLocation = useCallback((): AutoLocation => {
    const p = (pathnameRef.current ?? "").replace(/^\/+/, "");
    const path = p ? p.split("/").map(decodeURIComponent) : [];
    const params: Record<string, string> = {};
    if (searchParamsRef.current) {
      searchParamsRef.current.forEach((value, key) => {
        params[key] = value;
      });
    }
    return { path, params };
  }, []);

  // Reactively notify listeners on Next router navigation
  useEffect(() => {
    const nextLoc = readLocation();
    listenersRef.current.forEach((fn) => fn(nextLoc, { type: "snapshot" }));
  }, [pathname, searchParams, readLocation]);

  return useMemo<AutoHistoryAdapter>(
    () => ({
      read(): AutoLocation {
        return readLocation();
      },
      push(loc: AutoLocation): void {
        const query = loc.params
          ? new URLSearchParams(loc.params).toString()
          : "";
        const url =
          "/" +
          loc.path.map(encodeURIComponent).join("/") +
          (query ? `?${query}` : "");
        routerRef.current.push(url);
      },
      replace(loc: AutoLocation): void {
        const query = loc.params
          ? new URLSearchParams(loc.params).toString()
          : "";
        const url =
          "/" +
          loc.path.map(encodeURIComponent).join("/") +
          (query ? `?${query}` : "");
        routerRef.current.replace(url);
      },
      subscribe(
        listener: (location: AutoLocation, change?: AutoHistoryChange) => void,
      ): () => void {
        listenersRef.current.add(listener);
        return () => {
          listenersRef.current.delete(listener);
        };
      },
    }),
    [readLocation],
  );
}
```

---

## Adaptadores de histórico integrados

Para aplicativos autônomos, GitHub Pages ou ambientes de Node/testes, três adaptadores integrados são fornecidos:

```tsx
import {
  createHashHistory,
  createBrowserHistory,
  createMemoryHistory,
} from "@zeroman.yang/react-auto-components";

// 1. Hash-based (ideal for GitHub Pages / static hosting):
const hashHistory = createHashHistory({ basePath: "" });

// 2. HTML5 pushState (standard SPA routing):
const browserHistory = createBrowserHistory({ basePath: "/app" });

// 3. In-memory (headless testing, SSR, Node.js):
const memoryHistory = createMemoryHistory({
  path: ["table", "local"],
  params: {},
});
memoryHistory.push({ path: ["table", "large"], params: {} });
memoryHistory.back();
```

### Codec de URL

Todos os adaptadores usam `encodeLocation(loc, basePath, separator)` e `decodeLocation(url, basePath)`:

- URLs de hash unem os segmentos com `:` (`#/table:local`). URLs de navegador os unem com `/` (`/app/table/local`). A decodificação aceita qualquer um dos separadores.
- Um caminho vazio ainda pode carregar parâmetros: `?tab=a` e `#/?tab=a` decodificam para `{ path: [], params: { tab: "a" } }`.
- O `basePath` corresponde apenas em uma fronteira de segmento: com `basePath: "/admin"`, `/admin/users` decodifica para `["users"]`, enquanto `/administrator` está fora dessa navegação e decodifica como uma localização vazia.
- Caminhos Unicode e chaves/valores de parâmetros são escapados de forma limpa com `encodeURIComponent`.
- Strings de parâmetros vazias (por exemplo, `{ query: "" }`) são preservadas como `?query=` em vez de descartadas.
- Segmentos com dois-pontos, barras ou símbolos de consulta incorporados são codificados de forma confiável.

---

## Sincronização de histórico (`syncHistory`)

`syncHistory(navigation, adapter)` conecta uma instância de `AutoNavigation` a um `AutoHistoryAdapter`.

- **Isolamento de caminho intermediário**: ao navegar para um filho carregado de forma preguiçosa, estados de rota intermediários disparam a montagem no React sem gravar URLs inacabadas. Apenas navegações confirmadas (`subscribeCommit`) gravam no histórico.
- **Prevenção de eco**: navegações iniciadas a partir de mudanças externas de URL carregam `source: "history"`. Seus eventos de confirmação nunca são ecoados de volta ao adaptador.
- **Identidade de transição**: navegações externas rejeitadas ou proibidas são reconciliadas para a rota válida mais próxima e chamam `adapter.replace()`. Navegações com falha mais antigas não podem sobrescrever navegações do usuário mais recentes.
- **Sincronização inicial**: uma URL não vazia que difere da localização confirmada navega até lá. Uma URL vazia recebe a localização confirmada por meio de `adapter.replace()`. Uma URL que já corresponde é deixada como está, de modo que recriar o adaptador (por exemplo, `history={createHashHistory()}` escrito inline) nunca cancela uma navegação pendente.
- **URLs de filho padrão**: quando um destino do histórico é resolvido para um filho padrão, o caminho concluído substitui a URL incompleta, preservando seus parâmetros e a entrada do histórico.
- **Escritas assíncronas**: as escritas são executadas em ordem. Uma confirmação mais recente é comparada com `read()` somente depois que as escritas anteriores terminam, de modo que um retorno à URL original não possa ser perdido. Notificações atrasadas de uma URL já observada não cancelam uma navegação preguiçosa mais recente. Uma mudança real de histórico de volta à rota confirmada ainda cancela o trabalho pendente.
- **Limpeza**: retorna uma função de cancelamento de inscrição que desconecta os listeners e descarta as escritas enfileiradas. Uma escrita já emitida para um roteador externo não pode ser cancelada pela ponte.

Os métodos `push`/`replace` do adaptador devem atualizar `read()` sincronamente, retornar uma promise que só se resolve quando `read()` reflete a conclusão, ou retornar `void` e confirmar a escrita adiada por meio de `subscribe`. As notificações devem descrever a localização atualmente retornada por `read()`. Promises rejeitadas são relatadas por meio de `console.error` e liberam a próxima escrita enfileirada. Uma escrita `void` adiada é liberada quando o adaptador publica uma localização diferente (por exemplo, um redirecionamento) ou após 2 segundos sem confirmação, como no caso de uma navegação bloqueada pelo roteador. Se uma promise for resolvida antes de `read()` refletir a nova localização, a notificação posterior dessa localização é tratada como a mesma escrita, e não como uma nova navegação.

---

## Integração de componentes: AutoMenu e AutoTabs

Para um contêiner preguiçoso personalizado, declare seu filho como `{ id: "details", awaitRegistration: true }` quando a entrada comum deve aguardar esse contêiner se registrar e resolver seu `defaultChild`. O `AutoTabs` define isso automaticamente para itens com `children` aninhados. Isso evita confirmar uma URL pai antes que o filho padrão seja conhecido.

### AutoMenu

O `AutoMenu` oferece participação declarativa na árvore de navegação por meio da prop `route`:

```tsx
<AutoMenu
  route={{ name: "workspace", defaultChild: "projects" }}
  items={[
    {
      id: "projects",
      label: "Projects",
      content: <ProjectsView />, // Mounted when selected
    },
    {
      id: "settings",
      label: "Settings",
      children: [
        { id: "profile", label: "Profile", content: <ProfileView /> }, // path: workspace:profile
      ],
    },
    {
      id: "quick-docs",
      label: "Documentation",
      target: "workspace:docs:getting-started", // Shortcut link; calls goto() without duplicating content
    },
  ]}
/>
```

- **Um único nível de rota**: um menu adiciona exatamente um segmento abaixo de sua própria rota. Grupos apenas organizam as entradas, de modo que cada folha é um filho direto (`workspace:profile`, e não `workspace:settings:profile`), razão pela qual os ids devem ser únicos em todo o menu. Uma folha herda `disabled`, `hidden`, `roles` e `permissions` de seus grupos.
- **Seleção**: com `route`, a entrada selecionada é a folha cujo id é o segmento filho ativo. Caso contrário, dentro de um provider, é a folha cujo `target` é o prefixo mais longo do caminho atual.
- **`content`**: quando fornecido em qualquer item, o `AutoMenu` envolve o layout em `.auto-menu-container` e monta o conteúdo do item selecionado em `.auto-menu-content`. Se nenhum item definir `content`, o elemento tradicional de barra lateral única é renderizado.
- **`target`**: um destino de atalho. O clique invoca `nav.goto(target)` sem montar conteúdo sob esse item. Cadeias cíclicas de atalhos (por exemplo, `a -> b -> a`) são detectadas e impedidas.

### AutoTabs

O `AutoTabs` oferece alternância de abas guiada por rota:

```tsx
<AutoTabs
  route={{ name: "tabs", defaultChild: "basic" }}
  items={[
    { id: "basic", label: "Basic", content: <BasicTab /> },
    { id: "advanced", label: "Advanced", content: <AdvancedTab /> },
  ]}
/>
```

- **Política de conflito**: `route` e `value` são mutuamente exclusivos. Quando `route` é fornecido, `value` deve ser omitido porque o `AutoNavigation` é o dono da seleção. Se ambos forem fornecidos, `route` tem precedência e o aviso de desenvolvimento `RAC-TABS-ROUTE-VALUE` é registrado.
- **Abas aninhadas**: abas filhas são resolvidas em relação à rota da aba pai, sem navegação dupla.

---

## Referência da API principal

### `createAutoNavigation(options)`

Cria uma instância isolada do motor de navegação.

```ts
const nav = createAutoNavigation({
  initialPath: ["table", "local"],
  canAccess: (item) => true,
  readyTimeoutMs: 3000,
});
```

### `<AutoNavigationProvider>`

Provider de contexto React que gerencia o ciclo de vida da navegação. Passe para `history` o adaptador retornado por qualquer um dos hooks de framework acima. Configure as permissões por meio de `AutoConfigProvider.config.canAccess`; instâncias de navegação criadas externamente também retêm seu verificador de permissões da fábrica.

| Prop            | Tipo                          | Descrição                                                                                    |
| --------------- | ----------------------------- | -------------------------------------------------------------------------------------------- |
| `navigation`    | `AutoNavigation`              | Instância de navegação pré-criada opcional.                                                  |
| `initialPath`   | `string \| readonly string[]` | Caminho inicial se `navigation` for omitido.                                                 |
| `history`       | `AutoHistoryAdapter`          | Adaptador opcional. Omita-o para desativar a sincronização de histórico.                      |
| `initialParams` | `Record<string, string>`      | Parâmetros iniciais se `navigation` for omitido.                                             |
| `hashSync`      | `boolean`                     | Atalho obsoleto de adaptador de hash, padrão `false`. Prefira `history={createHashHistory()}`. |

### `useAutoRoute(config)`

Declara a presença de um componente na árvore de navegação.

Quando um caminho inicial termina em um nó com um `defaultChild` acessível, o registro resolve e confirma esse filho no caminho real. O histórico usa substituição para essa normalização, de modo que o filho exibido, a URL e o signal da rota concordem entre si sem adicionar uma entrada.

O `setParams` mescla um patch de parâmetros: chaves omitidas permanecem inalteradas, `null` remove uma chave e `""` preserva um valor vazio. Durante uma navegação pendente, ele edita os parâmetros do destino e aguarda essa mesma navegação, em vez de cancelá-la. Editar um destino de histórico recebido substitui sua URL quando confirmado.

```ts
await setParams({ filter: null, query: "" });
```

```ts
const {
  nodePath, // Structural route path of this node
  activeChild, // Currently active child ID
  activeSubpath, // Path segments beyond this node
  params, // Current parameters
  signal, // AbortSignal, cancelled when params/path change or on unmount
  goto, // Navigate relative to this node
  replace, // Replace relative to this node
  setParams, // Update parameters
} = useAutoRoute({
  name: "settings",
  defaultChild: "profile",
  children: ["profile", "security"],
});
```

### `<AutoRouteScope>`

Escopo de contêiner explícito para componentes de layout personalizados:

```tsx
<AutoRouteScope path={["dashboard", "analytics"]}>
  <CustomMetricsPanel />
</AutoRouteScope>
```
