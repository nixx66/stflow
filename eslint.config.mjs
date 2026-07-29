import { createRequire } from "node:module";
import { dirname } from "node:path";

const require = createRequire(import.meta.url);
const configRoot = dirname(require.resolve("eslint-config-next"));
const fromNext = (name) => require(require.resolve(name, { paths: [configRoot] }));
const next = fromNext("@next/eslint-plugin-next");
const tsParser = fromNext("@typescript-eslint/parser");
const reactHooks = fromNext("eslint-plugin-react-hooks");

export default [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "cache/**",
      "lib/openzeppelin-contracts/**",
      ".superpowers/**"
    ]
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        ecmaVersion: "latest",
        sourceType: "module"
      }
    },
    plugins: {
      "@next/next": next,
      "react-hooks": reactHooks
    },
    rules: {
      ...next.configs.recommended.rules,
      ...next.configs["core-web-vitals"].rules,
      ...reactHooks.configs.recommended.rules,
      "@next/next/no-img-element": "off"
    }
  }
];
