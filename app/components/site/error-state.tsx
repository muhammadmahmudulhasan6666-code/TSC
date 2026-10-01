import { Logo } from "./brand";

/** Full-page error/404. Plain <a> (not <Link>) so it also works when the router itself failed. */
export function ErrorState({ code, title, body, action, homeHref = "/" }: { code?: string; title: string; body: string; action: string; homeHref?: string }) {
  return (
    <main id="main" className="container-page grid min-h-dvh place-items-center py-16 text-center">
      <div className="max-w-md">
        <Logo size={56} className="mx-auto" />
        {code && <p className="tabular mt-8 text-5xl font-bold text-muted/40">{code}</p>}
        <h1 className="mt-4 text-3xl">{title}</h1>
        <p className="mt-3 text-muted">{body}</p>
        <a href={homeHref} className="mt-8 inline-flex h-11 items-center rounded-[10px] bg-primary px-5 font-bold text-on-primary hover:bg-primary-hover">
          {action}
        </a>
      </div>
    </main>
  );
}
