import { useLocation } from "react-router";
import { getDict, localeFromPath, localizePath } from "~/i18n";
import { ErrorState } from "~/components/site/error-state";

export const meta = () => [{ title: "404 — TSC" }, { name: "robots", content: "noindex" }];

export default function NotFound() {
  const locale = localeFromPath(useLocation().pathname);
  const t = getDict(locale);
  return <ErrorState code="404" title={t.errors.notFoundTitle} body={t.errors.notFoundBody} action={t.errors.backHome} homeHref={localizePath("/", locale)} />;
}
