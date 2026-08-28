/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_APP_VERSION: string;
  readonly VITE_ENABLE_MOCK: 'true' | 'false';
  readonly VITE_ENABLE_SOUND: 'true' | 'false';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}