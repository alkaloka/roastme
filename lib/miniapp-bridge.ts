export type MiniAppViewer = {
  fid: number;
  username: string;
  displayName?: string;
  pfp?: string;
};

type MiniAppContextPayload = {
  viewer?: Partial<MiniAppViewer> & { username?: string };
};

type MiniAppBridgeLike = {
  getSession?: () => Promise<MiniAppContextPayload>;
  getViewer?: () => Promise<MiniAppViewer>;
  openCastComposer?: (payload: { text: string }) => Promise<void> | void;
  publishCast?: (payload: { text: string }) => Promise<void> | void;
};

const READY_MESSAGES = [
  "warpcast-miniapp:ready",
  "farcaster.miniapp.ready",
  "miniapp-ready"
];

const CONTEXT_MESSAGES = [
  "warpcast-miniapp:context",
  "farcaster.miniapp.context",
  "miniapp-context"
];

export function bootstrapMiniAppBridge(onViewer: (viewer: MiniAppViewer) => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const bridge: MiniAppBridgeLike | undefined = (window as never as { farcaster?: MiniAppBridgeLike }).farcaster;

  let disposed = false;

  const tryEmitFromBridge = async () => {
    if (!bridge || disposed) return;

    const candidates = [
      () => bridge.getViewer?.(),
      async () => {
        const session = await bridge.getSession?.();
        if (session?.viewer?.username) {
          return normalizeViewer(session.viewer);
        }
        return undefined;
      }
    ];

    for (const candidate of candidates) {
      try {
        const result = await candidate?.();
        if (result && !disposed) {
          onViewer(result);
          return;
        }
      } catch (error) {
        console.warn("miniapp bridge candidate failed", error);
      }
    }
  };

  const handleMessage = (event: MessageEvent) => {
    if (!event.data) return;
    const data = event.data;
    if (typeof data !== "object") return;

    const type = (data as { type?: string }).type;
    if (!type) return;

    if (CONTEXT_MESSAGES.includes(type)) {
      const payload = (data as { payload?: MiniAppContextPayload }).payload ?? (data as MiniAppContextPayload);
      const viewer = payload?.viewer ? normalizeViewer(payload.viewer) : undefined;
      if (viewer) {
        onViewer(viewer);
      }
    }
  };

  window.addEventListener("message", handleMessage);

  READY_MESSAGES.forEach((type) => {
    try {
      window.parent?.postMessage({ type }, "*");
    } catch (error) {
      console.warn("Unable to notify miniapp host", error);
    }
  });

  void tryEmitFromBridge();

  return () => {
    disposed = true;
    window.removeEventListener("message", handleMessage);
  };
}

export function normalizeViewer(raw: Partial<MiniAppViewer> & { username?: string }): MiniAppViewer | undefined {
  const username = raw.username?.replace(/^@/, "");
  if (!username) {
    return undefined;
  }

  return {
    fid: typeof raw.fid === "number" ? raw.fid : Number(raw.fid ?? 0) || 0,
    username,
    displayName: raw.displayName ?? raw?.username ?? username,
    pfp: raw.pfp
  };
}

export function tryPublishCast(text: string) {
  if (typeof window === "undefined") return false;
  const bridge: MiniAppBridgeLike | undefined = (window as never as { farcaster?: MiniAppBridgeLike }).farcaster;

  const publisher = bridge?.publishCast ?? bridge?.openCastComposer;
  if (!publisher) {
    return false;
  }

  try {
    void publisher({ text });
    return true;
  } catch (error) {
    console.warn("Failed to invoke publishCast", error);
    return false;
  }
}

