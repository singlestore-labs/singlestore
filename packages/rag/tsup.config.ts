import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["./src/index.ts"],
    outDir: "./dist",
    format: ["cjs", "esm"],
    external: ["@singlestore/ai", "@singlestore/client", "nanoid"],
    dts: true,
    sourcemap: true,
  },
]);
