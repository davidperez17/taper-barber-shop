import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  {
    ignores: [".claude/**", ".next/**", "node_modules/**", "video/**"],
  },
  ...nextVitals,
  ...nextTypescript,
];

export default eslintConfig;
