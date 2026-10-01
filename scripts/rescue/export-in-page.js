// Runs INSIDE Mahmud's logged-in https://tscmmh.bd admin tab (code.md §9.1).
// Uses the page's own super_admin session to read every table/bucket it can,
// and streams results to the local receiver (scripts/rescue/receiver.mjs).
// Returns only counts — no row data is printed.
// Usage: window.__tscRescue({ anonKey, rescueKey, mode: "tables" | "files" })
window.__tscRescue = async function ({ anonKey, rescueKey, mode = "tables", buckets: onlyBuckets }) {
  const REF = "pipxumfqykczzwcvfgua";
  const BASE = `https://${REF}.supabase.co`;
  const STORE = "tsc-auth-v1"; // the live app uses a custom storage key
  const RECV = "http://127.0.0.1:8787/save";
  const session = JSON.parse(localStorage.getItem(STORE) || "null");
  if (!session?.access_token) return { error: "not logged in" };
  const jwt = () => JSON.parse(localStorage.getItem(STORE)).access_token;
  const h = (extra = {}) => ({ apikey: anonKey, Authorization: `Bearer ${jwt()}`, ...extra });

  const save = async (path, body, type = "application/json") => {
    const r = await fetch(`${RECV}?path=${encodeURIComponent(path)}`, {
      method: "POST",
      headers: { "content-type": type, "x-rescue-key": rescueKey },
      body,
    });
    if (!r.ok) throw new Error(`receiver ${r.status} for ${path}`);
  };

  const TABLES = `ad_campaign_phases ad_campaigns admin_audit_log admin_messages admin_override_log admin_quick_requests ambassador_applications ambassador_connects_grants ambassador_referrals ambassador_tiers bookings certification_applications community_comments community_post_loves community_posts competitor_intel concierge_assignments concierge_internal_info concierge_requests connect_packages contact_submissions contact_unlocks content_loves content_moderation_queue disputes documents email_send_log email_webhook_events free_materials gift_requests institution_alias_patterns institution_aliases knowledge_requests marketing_posts match_outcomes mathsprint_answers mathsprint_attempts mathsprint_badges mathsprint_editions mathsprint_email_dispatch_log mathsprint_questions mathsprint_registration_attempts mathsprint_registrations notes_admin_members notes_digitalization_jobs notes_digitalization_refunds notes_earnings_ledger notes_listings notes_loves notes_payout_requests notes_purchases notes_reviews notes_seller_limits notes_submissions notes_view_log notifications online_certification_applications payment_info_submissions payments pending_profile_changes pixel_event_logs platform_settings portfolio_custom_domains portfolio_leads portfolio_share_events portfolio_view_events profile_audit_log profile_boosts profile_upgrades profile_view_logs referrals reviews saved_teachers security_alerts service_pricing student_free_events student_profiles student_sensitive_info success_stories super_admin_telegram_subscribers teacher_availability teacher_blocked_dates teacher_courses teacher_faqs teacher_hand_raises teacher_needed_email_log teacher_needed_posts teacher_portfolio_sections teacher_portfolio_videos teacher_premium_subscriptions teacher_pride_stories teacher_profiles teacher_sensitive_info teacher_student_results teacher_video_intros teaching_style_images testimonial_screenshots text_intelligence_log tsci_knowledge_entries tuition_requests tutorial_videos user_connects user_profiles user_roles ambassador_referrals_safe concierge_requests_safe match_fraud_signals student_profiles_public teacher_profiles_public v_notes_seller_identity _lovable_migrations`.split(" ");
  const BUCKETS = onlyBuckets || ["profile-photos", "documents", "teaching-images", "video-intros", "community-posts", "free-materials", "mathsprint-questions", "mynotes-raw", "portfolio-brand", "testimonial-screenshots", "tutorial-thumbnails", "notes-previews", "notes-full"];

  const summary = {};

  if (mode === "tables") {
    for (const t of TABLES) {
      const rows = [];
      let from = 0, total = null, err = null;
      while (true) {
        const r = await fetch(`${BASE}/rest/v1/${t}?select=*`, {
          headers: h({ Range: `${from}-${from + 999}`, "Range-Unit": "items", Prefer: "count=exact" }),
        });
        if (!r.ok && r.status !== 206) { err = `${r.status} ${(await r.text()).slice(0, 160)}`; break; }
        const cr = r.headers.get("content-range"); // e.g. 0-999/1234
        if (cr && cr.includes("/")) total = Number(cr.split("/")[1]);
        const page = await r.json();
        rows.push(...page);
        if (page.length < 1000) break;
        from += 1000;
      }
      if (!err) await save(`tables/${t}.json`, JSON.stringify(rows));
      summary[t] = err ? { error: err } : { rows: rows.length, total };
    }
    await save("tables/_summary.json", JSON.stringify(summary, null, 2));
    // Public RPCs without arguments that describe config/state.
    for (const fn of ["list_mathsprint_editions", "get_current_mathsprint_edition", "get_public_platform_settings", "get_home_stats", "notes_admin_analytics_overview"]) {
      const r = await fetch(`${BASE}/rest/v1/rpc/${fn}`, { method: "POST", headers: h({ "content-type": "application/json" }), body: "{}" });
      const body = await r.text();
      if (r.ok) await save(`rpc/${fn}.json`, body);
      summary[`rpc:${fn}`] = r.ok ? "ok" : `${r.status}`;
    }
    return summary;
  }

  // mode === "files": list every bucket recursively, save listing, then download each object.
  const listAll = async (bucket, prefix = "") => {
    const out = [];
    for (let offset = 0; ; offset += 1000) {
      const r = await fetch(`${BASE}/storage/v1/object/list/${bucket}`, {
        method: "POST",
        headers: h({ "content-type": "application/json" }),
        body: JSON.stringify({ prefix, limit: 1000, offset, sortBy: { column: "name", order: "asc" } }),
      });
      if (!r.ok) throw new Error(`${r.status}`);
      const items = await r.json();
      for (const it of items) {
        const full = prefix ? `${prefix}/${it.name}` : it.name;
        if (it.id === null) out.push(...(await listAll(bucket, full)));
        else out.push({ path: full, size: it.metadata?.size, mimetype: it.metadata?.mimetype, updated_at: it.updated_at });
      }
      if (items.length < 1000) break;
    }
    return out;
  };

  for (const b of BUCKETS) {
    let objs;
    try { objs = await listAll(b); } catch (e) { summary[b] = { error: String(e.message) }; continue; }
    await save(`storage-listing/${b}.json`, JSON.stringify(objs));
    let ok = 0, fail = [];
    for (const o of objs) {
      const r = await fetch(`${BASE}/storage/v1/object/authenticated/${b}/${o.path.split("/").map(encodeURIComponent).join("/")}`, { headers: h() });
      if (!r.ok) { fail.push(`${o.path} ${r.status}`); continue; }
      await save(`storage/${b}/${o.path}`, await r.blob(), "application/octet-stream");
      ok++;
    }
    summary[b] = { listed: objs.length, downloaded: ok, failed: fail.length };
    if (fail.length) await save(`storage-listing/${b}.failed.json`, JSON.stringify(fail));
  }
  await save(`storage-listing/_summary.json`, JSON.stringify(summary, null, 2));
  return summary;
};
"rescue loaded";
