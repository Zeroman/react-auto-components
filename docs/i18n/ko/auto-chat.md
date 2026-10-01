# AutoChat

[English](../../auto-chat.md) | [简体中文](../zh-CN/auto-chat.md) | [繁體中文](../zh-TW/auto-chat.md) | [日本語](../ja/auto-chat.md) | **한국어** | [Español](../es/auto-chat.md) | [Français](../fr/auto-chat.md) | [Deutsch](../de/auto-chat.md) | [Português (Brasil)](../pt-BR/auto-chat.md) | [Русский](../ru/auto-chat.md)

선택적 입력창, 스트리밍 따르기, 이전 이력 로딩을 갖춘 대화 레이아웃입니다. AutoChat은 런타임 의존성을 추가하지 않으며, 네트워크 요청, 메시지 영속화, Markdown 파싱, 도구 출력 실행, 원시 HTML 렌더링도 하지 않습니다.

## 사용법

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
        // 여기에서 서비스를 호출하고 messages를 업데이트하세요.
      }}
    />
  );
}
```

## 렌더러는 직접 제공

React 노드를 `content`로 전달하거나, 애플리케이션 필드로 `AutoChatMessage`를 확장하고 `renderMessage(message, { index })`를 제공하세요. 기존 Markdown 렌더러, 코드 뷰어, 첨부 카드, 도구 결과 컴포넌트를 여기에 연결합니다. AutoChat은 이 형식을 해석하지 않으며, 일반 문자열은 텍스트로 렌더링됩니다. 링크, HTML, 상호작용 콘텐츠의 제어는 호스트에 있습니다.

각 메시지는 안정적이고 고유한 `id`와 `user`, `assistant`, `system`, `tool`, `error` 중 하나의 `role`을 가집니다. 선택적 `author`, `avatar`, `meta`, `streaming`으로 껍데기를 커스터마이즈하고, `renderActions(message, context)`로 메시지 액션을 제공합니다. 스트리밍 응답을 갱신할 때는 같은 ID를 유지하고, messages 배열은 불변 방식으로 교체하세요.

## 동작과 props

| Prop | 동작 |
| --- | --- |
| `height` | CSS 높이, 기본 `100%`. 부모에 확정 높이를 주거나 `600` 같은 숫자를 전달하세요. 이력은 컴포넌트 내부에서 스크롤됩니다. |
| `autoFollow` | 기본 `true`. 하단의 새 콘텐츠와 크기 변화를 따르고, 읽는 사람이 위로 스크롤하면 일시 중지합니다. **최신으로** 로 따르기를 재개합니다. |
| `hasMore`, `onLoadOlder`, `loadingOlder` | 이전 이력 버튼을 표시합니다. 안정적 ID로 메시지를 앞에 추가하며 보이는 메시지는 고정됩니다. 요청은 중복 제거되고, 실패한 요청은 재시도할 수 있습니다. |
| `onSend(text)` | 입력창을 활성화합니다. 원본의 공백 아닌 텍스트를 받고 Promise를 반환할 수 있습니다. 수락하면 임시글을 지우고, 거부하면 유지하며 일반 오류를 표시합니다. 최신 임시글이 이전 전송으로 지워지지 않습니다. |
| `value`, `defaultValue`, `onValueChange` | 제어 또는 로컬 입력값. 제어 값을 사용할 때는 호스트에서 변경을 적용합니다. |
| `generating`, `onStop` | 생성 중 전송을 비활성화하고 정지 버튼을 노출합니다. 호스트는 자체 스트림/요청을 취소하고 `generating`을 갱신해야 합니다. |
| `sendOnEnter` | 기본 `true`. Shift+Enter는 줄바꿈입니다. IME 조합 이벤트와 확정은 제출하지 않습니다. `false`로 설정하면 버튼으로만 전송합니다. |
| `disabled`, `composer` | 내장 에디터를 비활성화하거나, 외부 에디터 사용 시 숨깁니다(`composer={false}`). |
| `conversationKey` | 대화를 전환하면 로컬 임시글, 진행 중 UI, 스크롤을 초기화합니다. 제어 값과 취소는 여전히 호스트 소유입니다. |
| `header`, `footer`, `empty`, `composerExtra` | React 콘텐츠 슬롯입니다. |
| `size`, `density` | 전역 `AutoConfigProvider` 설정을 덮어씁니다. |
| `labels` | 내장 영어 라벨을 덮어씁니다. Provider는 `chat.send`, `chat.latest` 등 `chat.*` 키도 번역합니다. |
| `onSendError`, `onLoadError` | 애플리케이션 로깅을 위해 원본 오류를 전달받습니다. 내부 오류 세부 정보는 자동 표시되지 않습니다. |

대량 이력에서는 `virtual`을 설정해 패키지에 이미 있는 TanStack Virtual 의존성을 사용합니다. 보이는 메시지와 작은 overscan 창만 마운트되고, 동적 행 높이도 측정됩니다. 필요하면 `estimatedMessageHeight`(기본 `120`)와 `overscan`(기본 `6`)을 조정하세요. 이력을 앞에 추가할 때는 메시지 ID를 안정적으로 유지합니다. 가상 모드에서 뷰포트 밖 언마운트를 넘겨야 하는 상호작용 상태는 호스트에 보관하세요. 일반 대화는 기본적으로 비가상 레이아웃을 사용합니다.

**대량 이력** 데모는 1,000/10,000/50,000개의 가변 높이 메시지를 로드하고 실제 마운트된 메시지 수를 표시하며, 100개 추가, 스트리밍, 이전 이력 로딩, 양 끝으로 이동을 지원합니다.

`AutoChatHandle` ref는 `scrollToBottom()`, `scrollToMessage(id)`(ID 존재 여부 반환), `focusComposer()`, `getScrollElement()`를 노출합니다. 이력은 키보드로 포커스할 수 있는 로그이며, 별도 상태 영역이 전송/생성 상태를 알리고 스트리밍 토큰마다 알리지는 않습니다.

로컬 스트리밍 시뮬레이션, 취소, 사용자 지정 도구 카드, 페이지네이션, 전송 실패, 10개 언어 UI는 [실행 가능한 데모](../../../test-project/src/examples/ChatDemo.tsx)를 참고하세요.

## 데모의 풍부한 렌더링

사유 `test-project`는 [react-markdown](https://github.com/remarkjs/react-markdown)과 [remark-gfm](https://github.com/remarkjs/remark-gfm)을 설치합니다. 이 의존성은 컴포넌트 라이브러리에 포함되지 않습니다. 형식 선택기는 Markdown(제목, 강조, 작업 목록, GFM 표), 코드, JSON, 데이터 표, 로컬 이미지, 상호작용형 React 리뷰 카드를 삽입할 수 있습니다.

`ChatRenderers.tsx`는 구조화된 메시지 데이터에서 React 컴포넌트를 선택합니다. `ChatTaskCard.tsx`는 로컬 상호작용 상태를 보여줍니다. Markdown은 `skipHtml`과 라이브러리 기본 URL 처리를 사용하며 JSX를 컴파일하거나 코드 펜스를 실행하지 않습니다. 같은 Markdown 렌더러로 스트리밍 응답도 표시합니다. 사용자 지정 컴포넌트는 애플리케이션이 제공하며, 실행 가능한 메시지 텍스트에서 인스턴스화되지 않습니다.

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
