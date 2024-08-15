import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["./src/index.ts"],
    outDir: "./dist",
    format: ["cjs", "esm"],
    external: ["openai", "zod", "zod-to-json-schema"],
    dts: true,
    sourcemap: true,
  },
]);
