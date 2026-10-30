import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.pagebuddy.player",
  appName: "PageBuddy",
  webDir: "dist",
  ios: {
    contentInset: "always",
  },
};

export default config;
