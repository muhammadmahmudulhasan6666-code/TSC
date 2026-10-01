import type { Config } from "@react-router/dev/config";

// Static hosting on Cloudflare Pages: no runtime server. Public pages are pre-rendered to real HTML
// (SEO + Facebook previews); dashboards (/student, /teacher, /admin) fall back to the SPA shell.
export default {
  ssr: false,
  async prerender() {
    const { PUBLIC_PATHS } = await import("./app/routes");
    return PUBLIC_PATHS;
  },
} satisfies Config;
