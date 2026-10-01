import { useState } from "react";

type CardDecision = "pending" | "approved" | "declined";

export function ChatTaskCard({ tr }: { tr: (key: string) => string }) {
  const [decision, setDecision] = useState<CardDecision>("pending");
  const locked = decision !== "pending";

  const badgeLabel =
    decision === "approved"
      ? tr("chat.render.approved")
      : decision === "declined"
        ? tr("chat.render.declined")
        : tr("chat.render.pending");

  return (
    <div className="chat-render-card" data-testid="chat-task-card">
      <header className="chat-render-card-heading">
        {tr("chat.render.cardTitle")}
      </header>
      <p>{tr("chat.render.cardDescription")}</p>
      <span className="chat-render-badge" data-state={decision} role="status">
        {badgeLabel}
      </span>
      <div className="chat-render-progress">
        <progress
          max={100}
          value={72}
          aria-label={tr("chat.render.progress")}
        />
        <span>72%</span>
      </div>
      <div className="chat-render-card-actions">
        <button
          type="button"
          disabled={locked}
          onClick={() => setDecision("approved")}
        >
          {tr("chat.render.approve")}
        </button>
        <button
          type="button"
          disabled={locked}
          onClick={() => setDecision("declined")}
        >
          {tr("chat.render.decline")}
        </button>
      </div>
    </div>
  );
}
