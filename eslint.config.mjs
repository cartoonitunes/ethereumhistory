import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  {
    rules: {
      // Content-heavy UI frequently includes quotes/apostrophes.
      // Prefer allowing natural punctuation over escaping in JSX.
      "react/no-unescaped-entities": "off",

      // React Compiler warnings are noisy during dev; keep memoization explicit.
      "react-hooks/preserve-manual-memoization": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "dist/**",
    "next-env.d.ts",
    "drizzle/**",
    "pipeline/**",
    "data/**",
  ]),
]);

