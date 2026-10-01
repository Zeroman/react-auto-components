# AutoChat

[English](../../auto-chat.md) | [简体中文](../zh-CN/auto-chat.md) | [繁體中文](../zh-TW/auto-chat.md) | [日本語](../ja/auto-chat.md) | [한국어](../ko/auto-chat.md) | [Español](../es/auto-chat.md) | [Français](../fr/auto-chat.md) | [Deutsch](../de/auto-chat.md) | **Português (Brasil)** | [Русский](../ru/auto-chat.md)

Um layout de conversa com compositor opcional, acompanhamento de streaming e carregamento de histórico anterior. O AutoChat não adiciona dependências de runtime e não faz requisições de rede, não persiste mensagens, não analisa Markdown, não executa saída de ferramentas nem renderiza HTML bruto.

## Uso

```tsx
import { useState } from "react";
import { AutoChat, type AutoChatMessage } from "@zeroman/react-auto-components";
import "@zeroman/react-auto-components/style.css";

export function Conversation() {
  const [messages, setMessages] = useState<AutoChatMessage[]>([]);
  return (
    <AutoChat
      height={600}
      messages={messages}
      onSend={async (text) => {
        setMessages((current) => [
          ...current,
          { id: crypto.randomUUID(), role: "user", content: text },
        ]);
        // Chame seu serviço aqui e atualize messages.
      }}
    />
  );
}
```

## Traga seu próprio renderizador

Passe nós React como `content`, ou estenda `AutoChatMessage` com os campos da sua aplicação e forneça `renderMessage(message, { index })`. Conecte aí um renderizador Markdown existente, visualizador de código, cartão de anexos ou componente de resultado de ferramenta. O AutoChat nunca interpreta esses formatos; uma string simples é renderizada como texto. O renderizador hospedeiro controla links, HTML e qualquer conteúdo interativo.

Cada mensagem tem um `id` único e estável e um `role`: `user`, `assistant`, `system`, `tool` ou `error`. Os campos opcionais `author`, `avatar`, `meta` e `streaming` personalizam sua casca; `renderActions(message, context)` fornece ações por mensagem. Mantenha o mesmo ID ao atualizar uma resposta em streaming e substitua o array de messages de forma imutável.

## Comportamento e props

| Prop | Comportamento |
| --- | --- |
| `height` | Altura CSS, padrão `100%`. Dê ao pai uma altura definida ou passe um número como `600`. O histórico rola dentro do componente. |
| `autoFollow` | Padrão `true`. Acompanha conteúdo novo e redimensionado no rodapé; pausa quando o leitor rola para cima. **Voltar ao mais recente** retoma o acompanhamento. |
| `hasMore`, `onLoadOlder`, `loadingOlder` | Mostram um botão de histórico anterior. Antepõe mensagens com IDs estáveis; a mensagem visível permanece ancorada. As requisições são deduplicadas e uma requisição rejeitada pode ser repetida. |
| `onSend(text)` | Habilita o compositor. Recebe o texto original não vazio; pode retornar uma promessa. Aceitar limpa esse rascunho; rejeitar o preserva e exibe um erro genérico. Um rascunho mais novo nunca é limpo por um envio mais antigo. |
| `value`, `defaultValue`, `onValueChange` | Valor de compositor controlado ou local. Com valor controlado, aplique as mudanças no host. |
| `generating`, `onStop` | Desativa envios durante a geração e expõe um botão de parar. O host deve cancelar seu próprio stream/requisição e atualizar `generating`. |
| `sendOnEnter` | Padrão `true`; Shift+Enter insere nova linha. Eventos de composição e confirmação de IME nunca enviam. Use `false` para enviar apenas por botão. |
| `disabled`, `composer` | Desativa o editor integrado ou o oculta (`composer={false}`) ao usar um editor externo. |
| `conversationKey` | Redefine rascunho local, UI pendente e rolagem ao trocar de conversa. Valores controlados e cancelamento continuam pertencendo ao host. |
| `header`, `footer`, `empty`, `composerExtra` | Slots de conteúdo React. |
| `size`, `density` | Sobrescrevem as configurações globais do `AutoConfigProvider`. |
| `labels` | Sobrescrevem os rótulos embutidos em inglês. O provider também traduz `chat.send`, `chat.latest` e outras chaves `chat.*`. |
| `onSendError`, `onLoadError` | Recebem o erro original para logging da aplicação; detalhes internos do erro não são exibidos automaticamente. |

Para históricos grandes, ative `virtual` para usar a dependência TanStack Virtual já existente no pacote. Somente mensagens visíveis e uma pequena janela de overscan são montadas; alturas dinâmicas de linha são medidas. Ajuste se necessário `estimatedMessageHeight` (padrão `120`) e `overscan` (padrão `6`). Mantenha IDs de mensagem estáveis ao antepor histórico. No modo virtual, mantenha no host o estado interativo que precise sobreviver a linhas desmontadas fora do viewport. Conversas comuns usam por padrão o layout não virtual.

A demonstração de **Histórico grande** carrega 1.000, 10.000 ou 50.000 mensagens de altura variável, informa a contagem real de mensagens montadas e permite anexar 100 mensagens, streaming, carregar histórico anterior e saltar para qualquer extremo.

O ref `AutoChatHandle` expõe `scrollToBottom()`, `scrollToMessage(id)` (retorna se o ID existe), `focusComposer()` e `getScrollElement()`. O histórico usa um registro focalizável por teclado; uma região de status separada anuncia o estado de envio/geração sem anunciar cada token do streaming.

Veja [a demonstração executável](../../../test-project/src/examples/ChatDemo.tsx) para simulação local de streaming, cancelamento, um cartão de ferramenta personalizado, paginação, falhas de envio e interface em dez idiomas.

## Renderização rica na demonstração

O `test-project` privado instala [react-markdown](https://github.com/remarkjs/react-markdown) e [remark-gfm](https://github.com/remarkjs/remark-gfm). Essas dependências não fazem parte da biblioteca de componentes. Seu seletor de formatos insere Markdown (títulos, ênfase, listas de tarefas e tabelas GFM), código, JSON, tabelas de dados, uma imagem local ou um cartão React interativo de revisão.

`ChatRenderers.tsx` escolhe componentes React a partir de dados estruturados de mensagem. `ChatTaskCard.tsx` demonstra estado interativo local. O Markdown usa `skipHtml` e o tratamento padrão de URLs da biblioteca; não compila JSX nem executa blocos de código. O mesmo renderizador Markdown exibe respostas em streaming. Componentes personalizados são fornecidos pela aplicação, nunca instanciados a partir de texto de mensagem executável.

```tsx
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

<AutoChat
  messages={messages}
  renderMessage={(message) => (
    <Markdown remarkPlugins={[remarkGfm]} skipHtml>
      {String(message.content ?? "")}
    </Markdown>
  )}
/>
```
