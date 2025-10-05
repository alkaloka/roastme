import Image from "next/image";

export function Logo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
      <Image
        src="/logo.svg"
        alt="ROAST ME logo"
        width={60}
        height={60}
        priority
        style={{ borderRadius: "18px", boxShadow: "0 0 18px rgba(255, 64, 129, 0.35)" }}
      />
      <div>
        <strong style={{ fontSize: "1.65rem", letterSpacing: "0.08em" }}>ROAST ME</strong>
        <p style={{ margin: 0, opacity: 0.65, fontSize: "0.9rem" }}>Miniapp eksperimen di Farcaster</p>
      </div>
    </div>
  );
}
