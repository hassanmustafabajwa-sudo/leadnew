// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    // The new people-search server functions import createMiddleware from
    // @tanstack/react-start. Vite SSR can otherwise fail to resolve the
    // transitive export on a cold start, producing the generic root error page.
    // Pre-bundle both packages so the export chain is stable in SSR.
    ssr: {
      optimizeDeps: {
        include: ["@tanstack/react-start", "@tanstack/start-client-core"],
      },
    },
  },
});
