import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    rules: {
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/purity": "off",
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      ".next-e2e/**",
      ".next-e2e-debug/**",
      "out/**",
      "build/**",
      "test-results/**",
      "next-env.d.ts",
    ],
  },
  {
    files: ["tests/**/*"],
    rules: {
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          "ts-nocheck": "allow-with-description",
        },
      ],
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];

export default eslintConfig;
