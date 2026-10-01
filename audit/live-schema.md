# Live schema snapshot — old Lovable DB (read-only dump, 2026-10-01)

Source: `data-backup/2026-10-01/db/` (not in git). Row counts are real production counts; no personal data in this file.

- Tables: **97** · rows: **9674** · functions: **172** · triggers: **76** · RLS policies: **335** · cron jobs: **5** · applied pending-migrations (`_lovable_migrations`): **68**

| table | rows | columns | policies |
|---|---:|---:|---:|
| _lovable_migrations | 68 | 3 | 0 |
| admin_audit_log | 348 | 8 | 1 |
| admin_messages | 1313 | 7 | 3 |
| admin_override_log | 0 | 15 | 1 |
| admin_quick_requests | 31 | 18 | 3 |
| ambassador_applications | 1 | 15 | 3 |
| ambassador_connects_grants | 0 | 8 | 2 |
| ambassador_referrals | 1 | 9 | 3 |
| ambassador_tiers | 3 | 7 | 2 |
| bookings | 3 | 18 | 5 |
| certification_applications | 0 | 8 | 3 |
| community_comments | 0 | 8 | 4 |
| community_post_loves | 26 | 5 | 6 |
| community_posts | 6 | 17 | 6 |
| competitor_intel | 0 | 13 | 2 |
| concierge_assignments | 0 | 11 | 4 |
| concierge_requests | 0 | 22 | 3 |
| connect_packages | 4 | 12 | 3 |
| contact_submissions | 16 | 9 | 2 |
| contact_unlocks | 7 | 12 | 4 |
| content_loves | 127 | 6 | 6 |
| content_moderation_queue | 49 | 20 | 2 |
| disputes | 0 | 14 | 3 |
| documents | 93 | 12 | 3 |
| email_send_log | 1441 | 19 | 1 |
| email_webhook_events | 0 | 8 | 1 |
| free_materials | 8 | 18 | 5 |
| gift_requests | 94 | 11 | 3 |
| institution_alias_patterns | 19 | 5 | 2 |
| institution_aliases | 10 | 8 | 2 |
| knowledge_requests | 5 | 23 | 5 |
| marketing_posts | 3 | 13 | 2 |
| match_outcomes | 3 | 25 | 3 |
| mathsprint_answers | 52 | 6 | 3 |
| mathsprint_attempts | 8 | 19 | 3 |
| mathsprint_badges | 81 | 7 | 3 |
| mathsprint_editions | 2 | 12 | 2 |
| mathsprint_email_dispatch_log | 0 | 7 | 0 |
| mathsprint_questions | 50 | 9 | 1 |
| mathsprint_registration_attempts | 442 | 15 | 2 |
| mathsprint_registrations | 96 | 15 | 3 |
| notes_admin_members | 1 | 8 | 2 |
| notes_digitalization_jobs | 4 | 27 | 1 |
| notes_digitalization_refunds | 0 | 10 | 1 |
| notes_earnings_ledger | 4 | 8 | 2 |
| notes_listings | 10 | 41 | 6 |
| notes_loves | 16 | 5 | 2 |
| notes_payout_requests | 2 | 11 | 2 |
| notes_purchases | 2 | 21 | 4 |
| notes_reviews | 2 | 12 | 5 |
| notes_seller_limits | 1 | 8 | 2 |
| notes_submissions | 5 | 9 | 2 |
| notes_view_log | 165 | 5 | 2 |
| notifications | 1749 | 8 | 4 |
| online_certification_applications | 1 | 12 | 3 |
| payment_info_submissions | 2 | 13 | 3 |
| payments | 128 | 11 | 2 |
| pending_profile_changes | 119 | 7 | 3 |
| platform_settings | 25 | 6 | 1 |
| portfolio_leads | 0 | 9 | 3 |
| profile_audit_log | 1464 | 9 | 2 |
| profile_boosts | 5 | 8 | 2 |
| profile_upgrades | 3 | 5 | 2 |
| profile_view_logs | 243 | 5 | 3 |
| referrals | 0 | 8 | 3 |
| reviews | 0 | 20 | 6 |
| saved_teachers | 1 | 4 | 1 |
| security_alerts | 0 | 14 | 1 |
| service_pricing | 9 | 9 | 2 |
| student_free_events | 2 | 11 | 2 |
| student_profiles | 155 | 32 | 4 |
| success_stories | 0 | 12 | 4 |
| super_admin_telegram_subscribers | 0 | 7 | 2 |
| teacher_availability | 35 | 7 | 2 |
| teacher_blocked_dates | 0 | 5 | 2 |
| teacher_custom_domains | 0 | 10 | 2 |
| teacher_faqs | 5 | 8 | 5 |
| teacher_free_resources | 0 | 11 | 2 |
| teacher_hand_raises | 3 | 7 | 5 |
| teacher_needed_email_log | 36 | 7 | 1 |
| teacher_needed_posts | 4 | 33 | 5 |
| teacher_premium_subscriptions | 0 | 10 | 3 |
| teacher_pride_stories | 6 | 16 | 5 |
| teacher_profiles | 174 | 69 | 3 |
| teacher_student_results | 0 | 11 | 2 |
| teacher_teaching_philosophy | 0 | 8 | 2 |
| teacher_video_intros | 2 | 9 | 3 |
| teacher_video_library | 0 | 10 | 2 |
| teaching_style_images | 5 | 10 | 5 |
| testimonial_screenshots | 0 | 12 | 2 |
| text_intelligence_log | 38 | 24 | 1 |
| tsci_knowledge_entries | 14 | 12 | 4 |
| tuition_requests | 1 | 19 | 5 |
| tutorial_videos | 0 | 21 | 3 |
| user_connects | 163 | 7 | 2 |
| user_profiles | 330 | 19 | 4 |
| user_roles | 330 | 4 | 2 |

## Cron jobs
- `auto-unsuspend-expired` — `0 * * * *` — SELECT public.auto_unsuspend_expired()
- `reconcile-pending-payments` — `*/5 * * * *` —  SELECT net.http_post( url := 'https://pipxumfqykczzwcvfgua.supabase.co/functions/v1/uddoktapay-checkout', headers := '{
- `expire-ambassador-connects-daily` — `0 3 * * *` —  SELECT net.http_post( url:='https://pipxumfqykczzwcvfgua.supabase.co/functions/v1/expire-ambassador-connects', headers:
- `cleanup-notifications-daily` — `0 21 * * *` — select net.http_post( url:='https://pipxumfqykczzwcvfgua.supabase.co/functions/v1/cleanup-old-notifications', headers:='
- `match-outcome-tracker-daily` — `0 3 * * *` —  select net.http_post( url:='https://pipxumfqykczzwcvfgua.supabase.co/functions/v1/match-outcome-tracker', headers:='{"C

## Applied files from `.lovable/pending_migrations` (per `_lovable_migrations`)
- brand_studio_columns.sql
- ensure_premium_subscriptions_table.sql
- get_public_teacher_cards_brand.sql
- mynotes_marketplace_v1.sql
- portfolio_columns_schema_cache_repair.sql
- premium_portfolio_brand_in_rpcs.sql
- public_teacher_profile_by_tsc_id.sql
- resolve_teacher_identifier_refresh.sql
- teacher_faqs_table.sql
- teacher_profiles_authenticated_select_all.sql
- vanity_slug_allow_uppercase.sql
- mynotes_phase5_limits_reviews.sql
- mynotes_phase6_authoring.sql
- mynotes_phase7_love_views_moderation.sql
- mynotes_phase8_storefront_and_profile_fix.sql
- mynotes_phase8_notifications_and_admin_delete.sql
- knowledge_requests.sql
- mynotes_admin_authored.sql
- knowledge_requests_admin_notify.sql
- mathsprint_threshold_min4.sql
- mathsprint_2_free_access.sql
- mynotes_purchase_info_preview_love_fix.sql
- mathsprint_public_participants.sql
- mathsprint_tab_switch_guard.sql
- mathsprint_fraud_detection_full.sql
- mathsprint_self_stats_with_fraud.sql
- mathsprint_1_hard_close_and_purge_s55.sql
- mynotes_love_anon_sessions.sql
- mynotes_bust_preview_cache_60deg.sql
- mynotes_bust_preview_cache_centered.sql
- mynotes_note_code_sequential.sql
- mynotes_review_moderation_status.sql
- mynotes_review_moderation_drop_old_fn.sql
- mynotes_listings_buyer_read.sql
- mynotes_reviews_submit_rpc_and_rls.sql
- mynotes_review_moderation_allow_super_admin.sql
- mynotes_review_approval_notification_fix.sql
- mynotes_admin_analytics_transparent.sql
- mynotes_payout_admin_atomic_flow.sql
- mynotes_payout_submit_rpc.sql
- mathsprint_editions_registry.sql
- mathsprint_registration_attempts_edition.sql
- teacher_needed_admin_posts.sql
- mynotes_notes_admin_program.sql
- mynotes_notes_admin_fix_tsc_lookup.sql
- mynotes_notes_admin_transparency.sql
- mynotes_admin_control_center.sql
- mynotes_bulletproof_fixes.sql
- mynotes_notes_admins_full_profile.sql
- mynotes_hide_sales_count_from_public.sql
- telegram_admin_alerts.sql
- 20260527041408_get_indexable_premium_portfolios.sql
- 20260527090000_competitor_intel.sql
- 20260527120000_tsci_notion_sync.sql
- 20260527140000_phase5b_resend_webhook.sql
- mynotes_digitalization_workbench.sql
- digitalization_prompt_v2_and_finalize.sql
- digitalization_rpc_fix_raw_paths.sql
- digitalization_master_prompt_v3_no_emoji_fenced.sql
- 20260527150000_digitalization_master_prompt_v4_blocks.sql
- 20260611120000_teacher_needed_region_alerts.sql
- 20260611130000_teacher_alert_district_aliases.sql
- 20260611140000_fix_get_active_teacher_needed_posts.sql
- 20260611150000_teacher_needed_student_class.sql
- 20260615120000_teacher_needed_curriculum.sql
- 20260617120000_marketing_posts_images.sql
- 20260904120000_mathsprint_edition_windows_and_results.sql
- 20260907_mathsprint_edition_fix_and_min6.sql
