import React, { useState } from "react";

type Tab = "home" | "chats" | "plans" | "you";

const TABS: { id: Tab; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "chats", label: "Chats" },
  { id: "plans", label: "Plans" },
  { id: "you", label: "You" },
];

/**
 * Synthetic product shell for public demo — mirrors SF11 IA without server secrets.
 */
export function DemoShell() {
  const [tab, setTab] = useState<Tab>("home");
  const [needs, setNeeds] = useState([
    {
      id: "1",
      title: "Book the restaurant.",
      detail: "Private reservation reminder (synthetic).",
    },
    {
      id: "2",
      title: "Jordan asked which area works best.",
      detail: "Open question in conversation (synthetic).",
    },
  ]);

  return (
    <section aria-label="Synthetic Opal demo">
      <p className="badge">Synthetic fixtures only · no real accounts</p>
      <div className="demo-tabs" role="tablist" aria-label="Demo navigation">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="demo-panel" role="tabpanel">
        {tab === "home" ? (
          <>
            <h2>Good evening, Alex.</h2>
            <p style={{ color: "var(--muted)", marginTop: 0 }}>Needs you</p>
            {needs.length === 0 ? (
              <p>Nothing needs you right now.</p>
            ) : (
              needs.map((n) => (
                <div className="item" key={n.id}>
                  <strong>{n.title}</strong>
                  <span>{n.detail}</span>
                  <div style={{ marginTop: 10 }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => setNeeds((prev) => prev.filter((x) => x.id !== n.id))}
                    >
                      Complete
                    </button>
                  </div>
                </div>
              ))
            )}
            <p style={{ color: "var(--muted)" }}>Coming up</p>
            <div className="item">
              <strong>Dinner with Jordan</strong>
              <span>Thursday at 7:00 PM · synthetic</span>
            </div>
          </>
        ) : null}

        {tab === "chats" ? (
          <>
            <h2>Chats</h2>
            <div className="item">
              <strong>Jordan</strong>
              <span>Dinner next Thursday may be a plan.</span>
            </div>
            <div className="item">
              <strong>Group friends</strong>
              <span>Saturday after 7 may work for everyone.</span>
            </div>
          </>
        ) : null}

        {tab === "plans" ? (
          <>
            <h2>Plans</h2>
            <div className="item">
              <strong>Dinner with Jordan</strong>
              <span>Upcoming · Thursday 7:00 PM</span>
            </div>
            <div className="item">
              <strong>Saturday group dinner</strong>
              <span>Needs confirmation · no progress percentage</span>
            </div>
          </>
        ) : null}

        {tab === "you" ? (
          <>
            <h2>You</h2>
            <div className="item">
              <strong>Alex Reed</strong>
              <span>Private by default · no behavior score</span>
            </div>
            <div className="item">
              <strong>Devices</strong>
              <span>1 synthetic session</span>
            </div>
            <div className="item">
              <strong>Safety</strong>
              <span>Blocks and reports available in product core</span>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
