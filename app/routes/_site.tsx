import { Outlet } from "react-router";
import { Backdrop, useSmoothScroll } from "~/components/fx/ambient";
import { SiteHeader } from "~/components/site/header";

export default function SiteLayout() {
  useSmoothScroll();
  return (
    <>
      <Backdrop />
      <SiteHeader />
      <main id="main">
        <Outlet />
      </main>
    </>
  );
}
