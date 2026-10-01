import { Outlet } from "react-router";
import { SiteHeader } from "~/components/site/header";

export default function SiteLayout() {
  return (
    <>
      <SiteHeader />
      <main id="main">
        <Outlet />
      </main>
    </>
  );
}
