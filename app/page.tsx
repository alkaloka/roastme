"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Logo } from "./components/Logo";
import { bootstrapMiniAppBridge, MiniAppViewer } from "@/lib/miniapp-bridge";

type ThemeName = "light" | "dark";

type ThemeTokens = {
  background: string;
  cardBackground: string;
  cardBorder: string;
  cardShadow: string;
  text: string;
  subtext: string;
  accent: string;
  accentSoft: string;
  pillBackground: string;
  pillText: string;
  secondaryBackground: string;
  secondaryBorder: string;
  inputBackground: string;
  inputBorder: string;
  inputText: string;
  disabledBackground: string;
  disabledText: string;
  divider: string;
};

const themes: Record<ThemeName, ThemeTokens> = {
  light: {
    background: "linear-gradient(180deg, #f9fbff 0%, #edf1ff 100%)",
    cardBackground: "rgba(255, 255, 255, 0.94)",
    cardBorder: "rgba(48, 78, 255, 0.14)",
    cardShadow: "0 32px 68px rgba(15, 23, 42, 0.18)",
    text: "#1a1d3a",
    subtext: "rgba(26, 29, 58, 0.72)",
    accent: "#304eff",
    accentSoft: "rgba(48, 78, 255, 0.12)",
    pillBackground: "rgba(48, 78, 255, 0.12)",
    pillText: "#304eff",
    secondaryBackground: "rgba(48, 78, 255, 0.06)",
    secondaryBorder: "rgba(48, 78, 255, 0.12)",
    inputBackground: "rgba(255, 255, 255, 0.96)",
    inputBorder: "rgba(48, 78, 255, 0.18)",
    inputText: "#1f243d",
    disabledBackground: "rgba(26, 29, 58, 0.08)",
    disabledText: "rgba(26, 29, 58, 0.42)",
    divider: "rgba(48, 78, 255, 0.16)"
  },
  dark: {
    background: "radial-gradient(circle at top, rgba(48, 78, 255, 0.22), rgba(2, 6, 23, 0.9) 70%)",
    cardBackground: "rgba(10, 16, 32, 0.9)",
    cardBorder: "rgba(156, 178, 255, 0.22)",
    cardShadow: "0 32px 72px rgba(2, 6, 23, 0.6)",
    text: "#f5f6ff",
    subtext: "rgba(233, 235, 255, 0.75)",
    accent: "#9cb2ff",
    accentSoft: "rgba(156, 178, 255, 0.16)",
    pillBackground: "rgba(156, 178, 255, 0.22)",
    pillText: "#f1f3ff",
    secondaryBackground: "rgba(22, 30, 54, 0.82)",
    secondaryBorder: "rgba(156, 178, 255, 0.24)",
    inputBackground: "rgba(12, 18, 36, 0.9)",
    inputBorder: "rgba(156, 178, 255, 0.24)",
    inputText: "#f1f4ff",
    disabledBackground: "rgba(255, 255, 255, 0.08)",
    disabledText: "rgba(255, 255, 255, 0.6)",
    divider: "rgba(156, 178, 255, 0.22)"
  }
};

type Styles = {
  container: CSSProperties;
  card: CSSProperties;
  header: CSSProperties;
  toggleButton: CSSProperties;
  comingSoonPill: CSSProperties;
  copyBlock: CSSProperties;
  title: CSSProperties;
  subtitle: CSSProperties;
  previewCard: CSSProperties;
  previewHeading: CSSProperties;
  previewDescription: CSSProperties;
  input: CSSProperties;
  viewerHint: CSSProperties;
  primaryButton: CSSProperties;
  disabledHint: CSSProperties;
  footer: CSSProperties;
  footerLine: CSSProperties;
};

const createStyles = (tokens: ThemeTokens): Styles => ({
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "clamp(1.5rem, 5vw, 4rem)",
    background: tokens.background,
    color: tokens.text,
    transition: "background 240ms ease, color 240ms ease"
  },
  card: {
    width: "min(520px, 100%)",
    background: tokens.cardBackground,
    borderRadius: "28px",
    padding: "2.5rem",
    border: `1px solid ${tokens.cardBorder}`,
    boxShadow: tokens.cardShadow,
    display: "flex",
    flexDirection: "column",
    gap: "1.75rem",
    backdropFilter: "blur(16px)",
    transition: "background 240ms ease, border-color 240ms ease, box-shadow 240ms ease"
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between"
  },
  toggleButton: {
    borderRadius: "999px",
    padding: "0.45rem 1.05rem",
    border: `1px solid ${tokens.accent}`,
    background: tokens.accentSoft,
    color: tokens.accent,
    fontSize: "0.85rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "transform 120ms ease, background 200ms ease, color 200ms ease"
  },
  comingSoonPill: {
    display: "inline-flex",
    alignSelf: "flex-start",
    padding: "0.35rem 0.9rem",
    borderRadius: "999px",
    background: tokens.pillBackground,
    color: tokens.pillText,
    fontSize: "0.78rem",
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    fontWeight: 700
  },
  copyBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "0.9rem"
  },
  title: {
    margin: 0,
    fontSize: "2rem",
    letterSpacing: "-0.01em",
    lineHeight: 1.2
  },
  subtitle: {
    margin: 0,
    fontSize: "1.05rem",
    lineHeight: 1.6,
    color: tokens.subtext
  },
  previewCard: {
    borderRadius: "20px",
    padding: "1.75rem",
    background: tokens.secondaryBackground,
    border: `1px solid ${tokens.secondaryBorder}`,
    display: "flex",
    flexDirection: "column",
    gap: "1rem"
  },
  previewHeading: {
    margin: 0,
    fontSize: "0.85rem",
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: tokens.subtext
  },
  previewDescription: {
    margin: 0,
    fontSize: "0.95rem",
    lineHeight: 1.5,
    color: tokens.subtext
  },
  input: {
    width: "100%",
    padding: "0.9rem 1.1rem",
    borderRadius: "14px",
    border: `1px solid ${tokens.inputBorder}`,
    background: tokens.inputBackground,
    color: tokens.inputText,
    fontSize: "1rem"
  },
  viewerHint: {
    margin: 0,
    fontSize: "0.85rem",
    color: tokens.subtext
  },
  primaryButton: {
    padding: "0.95rem 1.2rem",
    borderRadius: "999px",
    border: "none",
    fontSize: "1rem",
    fontWeight: 600,
    cursor: "not-allowed",
    background: tokens.disabledBackground,
    color: tokens.disabledText
  },
  disabledHint: {
    fontSize: "0.85rem",
    color: tokens.subtext
  },
  footer: {
    borderTop: `1px solid ${tokens.divider}`,
    paddingTop: "1.25rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.6rem"
  },
  footerLine: {
    margin: 0,
    fontSize: "0.85rem",
    color: tokens.subtext
  }
});

export default function Home() {
  const [viewer, setViewer] = useState<MiniAppViewer | null>(null);
  const [manualUsername, setManualUsername] = useState("");
  const [theme, setTheme] = useState<ThemeName>("light");

  useEffect(() => {
    const dispose = bootstrapMiniAppBridge((contextViewer) => {
      setViewer(contextViewer);
      setManualUsername("");
    });

    return () => {
      dispose?.();
    };
  }, []);

  useEffect(() => {
    const body = document.body;
    body.dataset.theme = theme;
    return () => {
      delete body.dataset.theme;
    };
  }, [theme]);

  const username = useMemo(() => viewer?.username ?? manualUsername.trim(), [viewer?.username, manualUsername]);
  const styles = useMemo(() => createStyles(themes[theme]), [theme]);

  const descriptor = username ? `@${username}` : "your Farcaster account";

  return (
    <main style={styles.container}>
      <div style={styles.card}>
        <header style={styles.header}>
          <Logo />
          <button
            type="button"
            onClick={() => setTheme((prev) => (prev === "light" ? "dark" : "light"))}
            style={styles.toggleButton}
          >
            {theme === "light" ? "Enable dark mode" : "Back to light mode"}
          </button>
        </header>

        <span style={styles.comingSoonPill}>Coming soon</span>

        <div style={styles.copyBlock}>
          <h1 style={styles.title}>English roasts for your Farcaster persona</h1>
          <p style={styles.subtitle}>
            We&apos;re polishing a playful generator that studies your latest casts and serves
            smart, English-language roasts tailored to {descriptor}. Stay tuned while we perfect the punchlines.
          </p>
        </div>

        <section style={styles.previewCard}>
          <p style={styles.previewHeading}>What to expect</p>
          <p style={styles.previewDescription}>
            Drop your Farcaster handle now so we know who to ping the moment the experience goes live.
            We&apos;ll keep the interface crisp for miniapps and the comebacks blazing.
          </p>
          <input
            style={styles.input}
            placeholder="farcaster username"
            value={manualUsername}
            onChange={(event) => setManualUsername(event.target.value)}
          />
          {viewer?.username ? (
            <p style={styles.viewerHint}>Detected viewer: @{viewer.username}</p>
          ) : null}
          <button type="button" style={styles.primaryButton} disabled>
            Coming soon
          </button>
          <span style={styles.disabledHint}>
            The roast oven is preheating. Submissions open once the results look delicious.
          </span>
        </section>

        <footer style={styles.footer}>
          <p style={styles.footerLine}>
            Crafted for Farcaster miniapps: default light mode to stay fresh, optional dark mode when you need the night vibes.
          </p>
          <p style={styles.footerLine}>Questions or ideas? Ping us on Farcaster and help shape the beta.</p>
        </footer>
      </div>
    </main>
  );
}
