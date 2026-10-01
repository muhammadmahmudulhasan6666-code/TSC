import { Outlet } from "react-router";
import { Backdrop, useSmoothScroll } from "~/components/fx/ambient";
import { CursorFollower } from "~/components/fx/cursor";
import { SiteHeader } from "~/components/site/header";

export default function SiteLayout() {
  useSmoothScroll();
  return (
    <>
      <Backdrop />
      <CursorFollower />
      <SiteHeader />
      <main id="main">
        <Outlet />
      </main>
    </>
  );
}
