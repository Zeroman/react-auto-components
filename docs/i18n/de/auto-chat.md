# AutoChat

[English](../../auto-chat.md) | [简体中文](../zh-CN/auto-chat.md) | [繁體中文](../zh-TW/auto-chat.md) | [日本語](../ja/auto-chat.md) | [한국어](../ko/auto-chat.md) | [Español](../es/auto-chat.md) | [Français](../fr/auto-chat.md) | **Deutsch** | [Português (Brasil)](../pt-BR/auto-chat.md) | [Русский](../ru/auto-chat.md)

Ein Konversationslayout mit optionalem Composer, Streaming-Follow und Laden älterer Verläufe. AutoChat fügt keine Laufzeitabhängigkeit hinzu und stellt keine Netzwerkanfragen, speichert keine Nachrichten, parst kein Markdown, führt keine Tool-Ausgaben aus und rendert kein rohes HTML.

## Verwendung

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
        // Rufen Sie hier Ihren Dienst auf und aktualisieren Sie messages.
      }}
    />
  );
}
```

## Eigene Renderer mitbringen

Übergeben Sie React-Knoten als `content`, oder erweitern Sie `AutoChatMessage` um Felder Ihrer Anwendung und stellen Sie `renderMessage(message, { index })` bereit. Binden Sie dort einen bestehenden Markdown-Renderer, Code-Viewer, Anhangskarte oder Tool-Ergebnis-Komponente an. AutoChat interpretiert diese Formate nie; eine einfache Zeichenfolge wird als Text gerendert. Links, HTML und interaktive Inhalte steuert der Host-Renderer.

Jede Nachricht hat eine stabile, eindeutige `id` und eine `role`: `user`, `assistant`, `system`, `tool` oder `error`. Optionale Felder `author`, `avatar`, `meta` und `streaming` passen die Hülle an; `renderActions(message, context)` liefert Nachrichtenaktionen. Behalten Sie beim Aktualisieren einer Streaming-Antwort dieselbe ID und ersetzen Sie das messages-Array unveränderlich.

## Verhalten und Props

| Prop | Verhalten |
| --- | --- |
| `height` | CSS-Höhe, Standard `100%`. Geben Sie dem Parent eine bestimmte Höhe oder übergeben Sie eine Zahl wie `600`. Der Verlauf scrollt innerhalb der Komponente. |
| `autoFollow` | Standard `true`. Folgt neuen und in der Größe veränderten Inhalten am unteren Rand; pausiert, wenn die Lesenden nach oben scrollen. **Zum Neuesten** setzt das Folgen fort. |
| `hasMore`, `onLoadOlder`, `loadingOlder` | Zeigen eine Schaltfläche für ältere Verläufe. Nachrichten werden mit stabilen IDs vorangestellt; die sichtbare Nachricht bleibt verankert. Anfragen werden dedupliziert, abgelehnte Anfragen können wiederholt werden. |
| `onSend(text)` | Aktiviert den Composer. Empfängt den ursprünglichen, nicht leeren Text; darf ein Promise zurückgeben. Bei Annahme wird der Entwurf geleert, bei Ablehnung bleibt er erhalten und ein generischer Fehler erscheint. Ein neuerer Entwurf wird nie durch ein älteres Senden geleert. |
| `value`, `defaultValue`, `onValueChange` | Gesteuerter oder lokaler Composer-Wert. Bei gesteuertem Wert wenden Sie Änderungen im Host an. |
| `generating`, `onStop` | Deaktiviert Senden während der Generierung und zeigt eine Stopp-Schaltfläche. Der Host muss eigenen Stream/Anfrage abbrechen und `generating` aktualisieren. |
| `sendOnEnter` | Standard `true`; Shift+Enter fügt einen Zeilenumbruch ein. Kompositionsereignisse und IME-Bestätigung senden nie. Auf `false` setzen für Senden nur per Schaltfläche. |
| `disabled`, `composer` | Deaktiviert den integrierten Editor oder blendet ihn aus (`composer={false}`), wenn ein externer Editor genutzt wird. |
| `conversationKey` | Setzt lokalen Entwurf, ausstehende UI und Scroll beim Wechsel der Konversation zurück. Gesteuerte Werte und Abbruch bleiben beim Host. |
| `header`, `footer`, `empty`, `composerExtra` | React-Inhaltsslots. |
| `size`, `density` | Überschreiben die globalen `AutoConfigProvider`-Einstellungen. |
| `labels` | Überschreiben die eingebauten englischen Beschriftungen. Der Provider übersetzt auch `chat.send`, `chat.latest` und weitere `chat.*`-Schlüssel. |
| `onSendError`, `onLoadError` | Empfangen den ursprünglichen Fehler für Anwendungs-Logging; interne Fehlerdetails werden nicht automatisch angezeigt. |

Für große Verläufe aktivieren Sie `virtual`, um die bereits vorhandene TanStack-Virtual-Abhängigkeit des Pakets zu nutzen. Es werden nur sichtbare Nachrichten und ein kleines Overscan-Fenster eingebaut; dynamische Zeilenhöhen werden gemessen. Passen Sie bei Bedarf `estimatedMessageHeight` (Standard `120`) und `overscan` (Standard `6`) an. Behalten Sie beim Voranstellen von Verlauf stabile Nachrichten-IDs. Halten Sie im virtuellen Modus interaktiven Zustand, der außerhalb des Viewports unmontierte Zeilen überdauern muss, im Host. Normale Konversationen nutzen standardmäßig das nichtvirtuelle Layout.

Die Demo **Großer Verlauf** lädt 1.000, 10.000 oder 50.000 Meldungen variabler Höhe, meldet die tatsächlich eingebauten Nachrichten und unterstützt das Anhängen von 100 Nachrichten, Streaming, das Laden älterer Verläufe und das Springen an beide Enden.

Das `AutoChatHandle`-Ref legt `scrollToBottom()`, `scrollToMessage(id)` (gibt an, ob die ID existiert), `focusComposer()` und `getScrollElement()` offen. Der Verlauf ist ein mit der Tastatur fokussierbares Log; ein getrennter Statusbereich kündigt Sende-/Generierungszustand an, ohne jeden Streaming-Token zu melden.

Siehe [die ausführbare Demo](../../../test-project/src/examples/ChatDemo.tsx) für lokale Streaming-Simulation, Abbruch, eine benutzerdefinierte Tool-Karte, Pagination, Sendefehler und eine Oberfläche in zehn Sprachen.

## Reichhaltiges Rendering in der Demo

Das private `test-project` installiert [react-markdown](https://github.com/remarkjs/react-markdown) und [remark-gfm](https://github.com/remarkjs/remark-gfm). Diese Abhängigkeiten gehören nicht zur Komponentenbibliothek. Dessen Formatauswahl fügt Markdown (Überschriften, Hervorhebungen, Aufgabenlisten und GFM-Tabellen), Code, JSON, Datentabellen, ein lokales Bild oder eine interaktive React-Review-Karte ein.

`ChatRenderers.tsx` wählt React-Komponenten aus strukturierten Nachrichtendaten. `ChatTaskCard.tsx` demonstriert lokalen Interaktionszustand. Markdown nutzt `skipHtml` und die Standard-URL-Behandlung der Bibliothek; es kompiliert kein JSX und führt keine Code-Blöcke aus. Derselbe Markdown-Renderer zeigt Streaming-Antworten. Benutzerdefinierte Komponenten stellt die Anwendung bereit; sie werden nicht aus ausführbarem Nachrichtentext instanziiert.

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
