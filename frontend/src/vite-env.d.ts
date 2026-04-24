/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the parser backend. Configured via .env.local. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
