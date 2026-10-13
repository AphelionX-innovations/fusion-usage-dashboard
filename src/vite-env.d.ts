/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUTH_API_URL?: string;
  readonly VITE_FUSION_API_URL?: string;
}

interface AppRuntimeConfig {
  VITE_AUTH_API_URL?: string;
  VITE_FUSION_API_URL?: string;
}

interface Window {
  __APP_CONFIG__?: AppRuntimeConfig;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
