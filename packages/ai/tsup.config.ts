import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["./src/index.ts"],
    outDir: "./dist",
    format: ["cjs", "esm"],
    external: ["openai"],
    dts: true,
    sourcemap: true,
  },
  {
    entry: ["./src/embeddings/index.ts"],
    outDir: "./dist/embeddings",
    format: ["cjs", "esm"],
    external: ["openai"],
    dts: true,
    sourcemap: true,
  },
  {
    entry: ["./src/chat-completions/index.ts"],
    outDir: "./dist/chat-completions",
    format: ["cjs", "esm"],
    external: ["openai", "zod", "zod-to-json-schema"],
    dts: true,
    sourcemap: true,
  },
  {
    entry: ["./src/chat-completions/errors/index.ts"],
    outDir: "./dist/chat-completions/errors",
    format: ["cjs", "esm"],
    external: ["openai", "zod", "zod-to-json-schema"],
    dts: true,
    sourcemap: true,
  },
]);
