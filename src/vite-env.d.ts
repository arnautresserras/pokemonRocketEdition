/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SENTRY_DSN?: string
  readonly VITE_MIXPANEL_TOKEN?: string
  readonly VITE_MIXPANEL_HOST?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
