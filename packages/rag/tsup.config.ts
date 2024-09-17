import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: {
      "index": "./src/index.ts",
      "chat/index": "./src/chat/index.ts",
      "chat/tools": "./src/chat/tools.ts",
      "session": "./src/chat/session.ts",
      "message": "./src/chat/message.ts",
    },
    outDir: "./dist",
    format: ["cjs", "esm"],
    external: ["@singlestore/ai", "@singlestore/client", "zod"],
    dts: true,
    sourcemap: true,
  },
]);
