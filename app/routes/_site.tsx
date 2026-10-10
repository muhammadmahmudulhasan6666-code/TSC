import { Outlet } from "react-router";
import { Backdrop, useSmoothScroll } from "~/components/fx/ambient";
import { CursorFollower } from "~/components/fx/cursor";
import { SiteFooter } from "~/components/site/footer";
import { SiteHeader } from "~/components/site/header";
import { WhatsAppFab } from "~/components/site/whatsapp-fab";

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
      <SiteFooter />
      <WhatsAppFab />
    </>
  );
}
