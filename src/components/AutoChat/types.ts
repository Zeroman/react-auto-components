import type { CSSProperties, Key, ReactNode, Ref } from "react";
import type { ComponentDensity, ComponentSize } from "../../core/types";

export type AutoChatRole = "user" | "assistant" | "system" | "tool" | "error";
export type AutoChatMessageLayout = "role" | "left" | "right" | "full";

/** Normalize application messages at the boundary; no transport protocol is assumed. */
export interface AutoChatMessage {
  /** Stable and unique within a conversation, including during streaming. */
  id: string;
  role: AutoChatRole;
  content?: ReactNode;
  author?: ReactNode;
  avatar?: ReactNode;
  meta?: ReactNode;
  streaming?: boolean;
}

export interface AutoChatHandle {
  scrollToBottom(): void;
  scrollToMessage(id: string): boolean;
  focusComposer(): void;
  getScrollElement(): HTMLDivElement | null;
}

export interface AutoChatLabels {
  conversation: string;
  empty: string;
  placeholder: string;
  composer: string;
  send: string;
  stop: string;
  sending: string;
  generating: string;
  latest: string;
  loadOlder: string;
  loading: string;
  sendError: string;
  loadError: string;
  user: string;
  assistant: string;
  system: string;
  tool: string;
  error: string;
}

export interface AutoChatProps<T extends AutoChatMessage = AutoChatMessage> {
  messages: readonly T[];
  /** Own Markdown, code, tool output and attachment rendering in the host. */
  renderMessage?: (message: T, context: { index: number }) => ReactNode;
  renderActions?: (message: T, context: { index: number }) => ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  empty?: ReactNode;
  /** Changing this key resets draft, pending UI and scroll state. */
  conversationKey?: Key;
  height?: CSSProperties["height"];
  className?: string;
  style?: CSSProperties;
  size?: ComponentSize;
  density?: ComponentDensity;
  /** Role-based alignment (default), all left/right, or full-width messages. */
  messageLayout?: AutoChatMessageLayout;
  labels?: Partial<AutoChatLabels>;
  /** Follow appended/resized content only while the reader is at the bottom. */
  autoFollow?: boolean;
  /** Reuse TanStack Virtual for large histories with measured message heights. */
  virtual?: boolean;
  estimatedMessageHeight?: number;
  overscan?: number;
  /** Hide the built-in composer, for read-only history or an external editor. */
  composer?: boolean;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Resolving accepts the draft; rejecting keeps it and shows a local error. */
  onSend?: (text: string) => void | Promise<void>;
  onSendError?: (error: unknown) => void;
  onStop?: () => void;
  generating?: boolean;
  disabled?: boolean;
  /** Enter sends; Shift+Enter inserts a newline. IME composition never sends. */
  sendOnEnter?: boolean;
  composerExtra?: ReactNode;
  hasMore?: boolean;
  loadingOlder?: boolean;
  onLoadOlder?: () => void | Promise<void>;
  onLoadError?: (error: unknown) => void;
  ref?: Ref<AutoChatHandle>;
}
