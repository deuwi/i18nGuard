/// <reference types="vite/client" />

declare module "*.json" {
  const content: Record<string, string>;
  export default content;
}
