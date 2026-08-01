import React, { useMemo, useState } from "react";
import { PRODUCT_COPY } from "./designTokens";
import { DemoShell } from "./DemoShell";

type Route = "home" | "demo" | "architecture" | "honesty";

function parseRoute(): Route {
  const hash = window.location.hash.replace(/^#\/?/, "") || "home";
  if (hash === "demo" || hash === "architecture" || hash === "honesty") return hash;
  return "home";
}

export function App() {
  const [route, setRoute] = useState<Route>(() => parseRoute());

  const go = (r: Route) => {
    window.location.hash = r === "home" ? "" : r;
    setRoute(r);
  };

  React.useEffect(() => {
    const onHash = () => setRoute(parseRoute());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const title = useMemo(() => {
    switch (route) {
      case "demo":
        return "Synthetic demo";
      case "architecture":
        return "Architecture";
      case "honesty":
        return "Honesty";
      default:
        return "Home";
    }
  }, [route]);

  return (
    <div className="shell">
      <header className="header">
        <div className="brand" aria-label="Opal">
          Opal
        </div>
        <nav className="nav" aria-label="Primary">
          <button type="button" aria-current={route === "home" ? "page" : undefined} onClick={() => go("home")}>
            Product
          </button>
          <button type="button" aria-current={route === "demo" ? "page" : undefined} onClick={() => go("demo")}>
            Demo
          </button>
          <button
            type="button"
            aria-current={route === "architecture" ? "page" : undefined}
            onClick={() => go("architecture")}
          >
            Architecture
          </button>
          <button
            type="button"
            aria-current={route === "honesty" ? "page" : undefined}
            onClick={() => go("honesty")}
          >
            Honesty
          </button>
        </nav>
      </header>

      <main className="main" aria-label={title}>
        {route === "home" ? <Landing onDemo={() => go("demo")} /> : null}
        {route === "demo" ? <DemoShell /> : null}
        {route === "architecture" ? <Architecture /> : null}
        {route === "honesty" ? <Honesty /> : null}
      </main>

      <footer className="footer">
        © NIOV Labs · opal.niovlabs.com · synthetic public surface · v0.13.0
      </footer>
    </div>
  );
}

function Landing({ onDemo }: { onDemo: () => void }) {
  return (
    <section className="hero">
      <p className="badge" style={{ margin: 0, color: "var(--accent-soft)" }}>
        {PRODUCT_COPY.tagline}
      </p>
      <h1>{PRODUCT_COPY.hero}</h1>
      <p className="lead">
        Conversation-native private communication with relationship intelligence underneath—not
        social media, not a feed, not a score.
      </p>
      <div className="actions">
        <button type="button" className="btn btn-primary" onClick={onDemo}>
          Open synthetic demo
        </button>
        <a className="btn" href="#architecture">
          How Opal is built
        </a>
      </div>
      <ul className="list" aria-label="What Opal is not">
        {PRODUCT_COPY.notList.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <div className="grid" aria-label="Product surfaces">
        <article className="card">
          <h3>Home</h3>
          <p>Calm orientation. Needs you (max three). Coming up. Quiet success.</p>
        </article>
        <article className="card">
          <h3>Chats</h3>
          <p>Private conversations remain the primary work surface.</p>
        </article>
        <article className="card">
          <h3>Plans</h3>
          <p>Shared journeys without project-management chrome.</p>
        </article>
        <article className="card">
          <h3>You</h3>
          <p>Identity, devices, privacy, and safety—progressive disclosure.</p>
        </article>
      </div>
      <p className="notice">{PRODUCT_COPY.honesty}</p>
    </section>
  );
}

function Architecture() {
  return (
    <section className="hero">
      <h1>Architecture stays Opal</h1>
      <p className="lead">
        This website is a public presentation and synthetic demo. Authoritative product behavior
        remains on Elixir/OTP + Phoenix, governed Python AI workers, PostgreSQL, and the Expo
        mobile client.
      </p>
      <div className="grid">
        <article className="card">
          <h3>Authority</h3>
          <p>Elixir owns sessions, membership, safety, and projections.</p>
        </article>
        <article className="card">
          <h3>AI</h3>
          <p>Python proposes only. Consent-gated. Never UI authority.</p>
        </article>
        <article className="card">
          <h3>Mobile</h3>
          <p>Expo React Native + SQLite offline remains primary client.</p>
        </article>
        <article className="card">
          <h3>Web</h3>
          <p>DOM public runtime only. No Convex, Clerk, or E2B in Opal core.</p>
        </article>
      </div>
      <p className="notice">
        External research: Vibra Code studied only (AGPL platform — not integrated). UI/UX Pro Max
        used as design intelligence filter. Motion for React is web/DOM-only if adopted later;
        mobile animation path is Reanimated when needed.
      </p>
    </section>
  );
}

function Honesty() {
  return (
    <section className="hero">
      <h1>Legal and release honesty</h1>
      <p className="lead">
        Social Flow 12 established an internally validated mobile release candidate. Social Flow 13
        adds a public web surface for product visibility.
      </p>
      <ul className="list">
        <li>Not App Store or Google Play approval</li>
        <li>Not production telecom or legal identity certification</li>
        <li>Not unrestricted youth production authorization</li>
        <li>Demo data is synthetic — no real phone numbers or conversations</li>
        <li>Private content is never indexed as a public social graph</li>
      </ul>
      <p className="notice">
        Production use requires jurisdiction-specific review, operational support, and broader
        adversarial testing beyond this public proof surface.
      </p>
    </section>
  );
}
