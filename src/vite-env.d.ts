/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUTH_API_URL?: string;
  readonly VITE_FUSION_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
