const DEFAULT_ROOT_URL = "https://roastme-mu.vercel.app";
const ROOT_URL = process.env.NEXT_PUBLIC_APP_URL ?? DEFAULT_ROOT_URL;

export const minikitConfig = {
  accountAssociation: {
    header: "eyJmaWQiOjE0Nzc4LCJ0eXBlIjoiYXV0aCIsImtleSI6IjB4NDQ4ZThhNjU2NWFEMUNBYTBmNEFBNEZFMDFEMDc5Qjc3MDk4ZWFkNCJ9",
    payload: "eyJkb21haW4iOiJyb2FzdG1lLW11LnZlcmNlbC5hcHAifQ",
    signature: "C8Mu08aJta55R8fk+Tr3yMhNaKn6HF9utTY6LNORpPV/M7KHTh0jZI+q547fr9RPMlA9WV5SylE3OX3s1lhOQxs="
  },
  miniapp: {
    version: "1",
    name: "ROAST ME",
    subtitle: "English roasts for Farcaster",
    description:
      "A playful generator that studies your latest casts and serves smart, English-language roasts tuned for miniapps.",
    homeUrl: ROOT_URL,
    iconUrl: `${ROOT_URL}/logo.svg`,
    screenshotUrls: [`${ROOT_URL}/logo.svg`],
    splashImageUrl: `${ROOT_URL}/logo.svg`,
    splashBackgroundColor: "#ffffff",
    primaryCategory: "social",
    tags: ["farcaster", "roast", "ai", "miniapp"],
    heroImageUrl: `${ROOT_URL}/logo.svg`,
    tagline: "Coming soon: English roasts",
    ogTitle: "ROAST ME — Coming Soon",
    ogDescription:
      "We are polishing a Farcaster miniapp that serves English-language roasts tailored to your casts.",
    ogImageUrl: `${ROOT_URL}/logo.svg`
  },
  baseBuilder: {
    allowedAddresses: ["0xE9445B3a831a675E62db26e90e63E233BdB6F32F"]
  }
} as const;

export type MinikitConfig = typeof minikitConfig;
export { ROOT_URL };



