import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["./index.ts"],
    outDir: "./dist",
    format: ["cjs", "esm"],
    external: ["@singlestore/ai", "@singlestore/client"],
    dts: true,
    sourcemap: true,
  },
]);
