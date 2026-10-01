# AutoChat

[English](../../auto-chat.md) | [简体中文](../zh-CN/auto-chat.md) | [繁體中文](../zh-TW/auto-chat.md) | [日本語](../ja/auto-chat.md) | [한국어](../ko/auto-chat.md) | **Español** | [Français](../fr/auto-chat.md) | [Deutsch](../de/auto-chat.md) | [Português (Brasil)](../pt-BR/auto-chat.md) | [Русский](../ru/auto-chat.md)

Un diseño de conversación con compositor opcional, seguimiento de streaming y carga de historial anterior. AutoChat no añade dependencias en tiempo de ejecución y no realiza peticiones de red, ni persiste mensajes, ni analiza Markdown, ni ejecuta salida de herramientas, ni renderiza HTML sin procesar.

## Uso

```tsx
import { useState } from "react";
import { AutoChat, type AutoChatMessage } from "@zeroman.yang/react-auto-components";
import "@zeroman.yang/react-auto-components/style.css";

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
        // Llama aquí a tu servicio y actualiza messages.
      }}
    />
  );
}
```

## Trae tu propio renderizador

Pasa nodos React como `content`, o amplía `AutoChatMessage` con los campos de tu aplicación y proporciona `renderMessage(message, { index })`. Conecta ahí un renderizador de Markdown existente, un visor de código, una tarjeta de adjuntos o un componente de resultado de herramientas. AutoChat nunca interpreta esos formatos; una cadena simple se renderiza como texto. El renderizador anfitrión controla los enlaces, el HTML y cualquier contenido interactivo.

Cada mensaje tiene un `id` único y estable y un `role`: `user`, `assistant`, `system`, `tool` o `error`. Los campos opcionales `author`, `avatar`, `meta` y `streaming` personalizan su estructura; `renderActions(message, context)` aporta acciones por mensaje. Mantén el mismo ID al actualizar una respuesta en streaming y sustituye el array de mensajes de forma inmutable.

## Comportamiento y props

| Prop | Comportamiento |
| --- | --- |
| `height` | Altura CSS, por defecto `100%`. Da al contenedor padre una altura definida o pasa un número como `600`. El historial se desplaza dentro del componente. |
| `autoFollow` | Por defecto `true`. Sigue el contenido nuevo y redimensionado al final; se pausa cuando el lector sube. **Volver al final** reanuda el seguimiento. |
| `hasMore`, `onLoadOlder`, `loadingOlder` | Muestran un botón de historial anterior. Antepone mensajes con IDs estables; el mensaje visible permanece anclado. Las peticiones se deduplican y una petición rechazada puede reintentarse. |
| `onSend(text)` | Habilita el compositor. Recibe el texto original no vacío; puede devolver una promesa. Al aceptar, limpia ese borrador; al rechazar, lo conserva y muestra un error genérico. Un borrador más nuevo nunca lo limpia un envío más antiguo. |
| `value`, `defaultValue`, `onValueChange` | Valor del compositor controlado o local. Con un valor controlado, aplica los cambios en el host. |
| `generating`, `onStop` | Desactiva envíos durante la generación y expone un botón de detención. El host debe cancelar su propio flujo/petición y actualizar `generating`. |
| `sendOnEnter` | Por defecto `true`; Shift+Enter inserta un salto de línea. Los eventos de composición y la confirmación IME nunca envían. Ponlo en `false` para enviar solo con botón. |
| `disabled`, `composer` | Desactiva el editor integrado o lo oculta (`composer={false}`) al usar un editor externo. |
| `conversationKey` | Restablece borrador local, UI pendiente y scroll al cambiar de conversación. Los valores controlados y la cancelación siguen siendo del host. |
| `header`, `footer`, `empty`, `composerExtra` | Slots de contenido React. |
| `size`, `density` | Anulan los ajustes globales de `AutoConfigProvider`. |
| `labels` | Anulan las etiquetas inglesas integradas. El provider también traduce `chat.send`, `chat.latest` y otras claves `chat.*`. |
| `onSendError`, `onLoadError` | Reciben el error original para registro de la aplicación; los detalles internos del error no se muestran automáticamente. |

Para historiales grandes, activa `virtual` para usar la dependencia TanStack Virtual ya incluida en el paquete. Solo se montan los mensajes visibles y una pequeña ventana de overscan; las alturas dinámicas se miden. Ajusta si hace falta `estimatedMessageHeight` (por defecto `120`) y `overscan` (por defecto `6`). Mantén IDs de mensaje estables al anteponer historial. En modo virtual, guarda en el host el estado interactivo que deba sobrevivir a filas desmontadas fuera del viewport. Las conversaciones normales usan por defecto el diseño no virtual.

La demo de **Historial grande** carga 1.000, 10.000 o 50.000 mensajes de altura variable, informa del número real de mensajes montados y permite añadir 100 mensajes, streaming, cargar historial anterior y saltar a cualquiera de los extremos.

El ref `AutoChatHandle` expone `scrollToBottom()`, `scrollToMessage(id)` (devuelve si el ID existe), `focusComposer()` y `getScrollElement()`. El historial usa un registro enfocable por teclado; una región de estado independiente anuncia el estado de envío/generación sin anunciar cada token del streaming.

Consulta [la demo ejecutable](../../../test-project/src/examples/ChatDemo.tsx) para una simulación local de streaming, cancelación, una tarjeta de herramienta personalizada, paginación, fallos de envío y una interfaz en diez idiomas.

## Renderizado enriquecido en la demo

El `test-project` privado instala [react-markdown](https://github.com/remarkjs/react-markdown) y [remark-gfm](https://github.com/remarkjs/remark-gfm). Estas dependencias no forman parte de la biblioteca de componentes. Su selector de formatos inserta Markdown (encabezados, énfasis, listas de tareas y tablas GFM), código, JSON, tablas de datos, una imagen local o una tarjeta React interactiva de reseña.

`ChatRenderers.tsx` elige componentes React a partir de datos de mensaje estructurados. `ChatTaskCard.tsx` demuestra estado interactivo local. Markdown usa `skipHtml` y el manejo de URLs por defecto de la biblioteca; no compila JSX ni ejecuta bloques de código. El mismo renderizador de Markdown muestra las respuestas en streaming. Los componentes personalizados los aporta la aplicación, no se instancian desde texto de mensaje ejecutable.

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
