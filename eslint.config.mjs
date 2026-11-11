import next from "eslint-config-next/core-web-vitals";
// Native navigation reloads authenticated admin data; storage hydrates after mount.
const config = [
  ...next,
  {
    rules: {
      "@next/next/no-html-link-for-pages": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
];
export default config;
