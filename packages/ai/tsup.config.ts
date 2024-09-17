import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: {
      "index": "./src/index.ts",
      "embeddings": "./src/embeddings/index.ts",
      "chat-completions/index": "./src/chat-completions/index.ts",
      "chat-completions/errors": "./src/chat-completions/errors/index.ts",
    },
    outDir: "./dist",
    format: ["cjs", "esm"],
    external: ["openai", "zod", "zod-to-json-schema"],
    dts: true,
    sourcemap: true,
  },
]);
