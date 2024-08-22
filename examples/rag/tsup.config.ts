import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["./index.ts"],
    outDir: "./dist",
    format: ["cjs", "esm"],
    external: ["@singlestore/ai", "@singlestore/client", "@singlestore/rag", "zod", "readline/promises"],
    dts: true,
    sourcemap: true,
  },
]);
