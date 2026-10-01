import type { Config } from "@react-router/dev/config";

// Static hosting on Cloudflare Pages: no runtime server. Public pages are pre-rendered to real HTML
// (SEO + Facebook previews); dashboards (/student, /teacher, /admin) fall back to the SPA shell.
export default {
  ssr: false,
  async prerender() {
    const { PUBLIC_PATHS } = await import("./app/routes");
    const { listPublicTeacherIds } = await import("./app/lib/api");
    // Every verified teacher gets a real HTML profile page in both languages.
    const ids = await listPublicTeacherIds().catch(() => [] as string[]);
    return [...PUBLIC_PATHS, ...ids.flatMap((id) => [`/teachers/${id}`, `/en/teachers/${id}`])];
  },
} satisfies Config;
