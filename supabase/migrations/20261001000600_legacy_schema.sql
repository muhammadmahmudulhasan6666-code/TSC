-- Exact archive of the old (Lovable) tables not yet re-modelled. Never exposed through the API;
-- module migrations move rows from here into the new public tables.
create schema if not exists legacy;
revoke all on schema legacy from public, anon, authenticated;
create table legacy."_lovable_migrations" (
  "name" text,
  "sha256" text,
  "applied_at" timestamptz,
  PRIMARY KEY (name)
);
create table legacy."admin_messages" (
  "id" uuid,
  "sender_id" uuid,
  "receiver_id" uuid,
  "subject" text,
  "message" text,
  "is_read" boolean,
  "created_at" timestamptz,
  PRIMARY KEY (id)
);
create table legacy."admin_override_log" (
  "id" uuid,
  "admin_id" uuid,
  "flow_type" text,
  "action" text,
  "target_id" uuid,
  "original_status" text,
  "new_status" text,
  "override_reason" text,
  "affected_user_ids" uuid[],
  "refund_amount" numeric,
  "before_snapshot" jsonb,
  "after_snapshot" jsonb,
  "notify_users" boolean,
  "ip_address" text,
  "created_at" timestamptz,
  PRIMARY KEY (id)
);
create table legacy."admin_quick_requests" (
  "id" uuid,
  "user_id" uuid,
  "tsc_id" text,
  "role" text,
  "requester_type" text,
  "phone" text,
  "email" text,
  "selected_services" text[],
  "answers" jsonb,
  "notes_others" jsonb,
  "status" text,
  "admin_notes" text,
  "assigned_admin" uuid,
  "contacted_at" timestamptz,
  "resolved_at" timestamptz,
  "created_at" timestamptz,
  "updated_at" timestamptz,
  "full_name" text,
  PRIMARY KEY (id)
);
create table legacy."ambassador_applications" (
  "id" uuid,
  "user_id" uuid,
  "teacher_id" uuid,
  "university_name" text,
  "status" text,
  "applied_at" timestamptz,
  "reviewed_by" uuid,
  "reviewed_at" timestamptz,
  "admin_notes" text,
  "student_id" uuid,
  "ambassador_tier" text,
  "total_accepted_referrals" int,
  "silver_claimed" boolean,
  "gold_claimed" boolean,
  "platinum_claimed" boolean,
  PRIMARY KEY (id)
);
create table legacy."ambassador_connects_grants" (
  "id" uuid,
  "user_id" uuid,
  "tier" text,
  "connects_amount" int,
  "claimed_at" timestamptz,
  "expires_at" timestamptz,
  "is_expired" boolean,
  "created_at" timestamptz,
  PRIMARY KEY (id)
);
create table legacy."ambassador_referrals" (
  "id" uuid,
  "ambassador_id" uuid,
  "referee_id" uuid,
  "referral_code" text,
  "status" text,
  "admin_reviewed_by" uuid,
  "admin_reviewed_at" timestamptz,
  "admin_notes" text,
  "created_at" timestamptz,
  PRIMARY KEY (id)
);
create table legacy."ambassador_tiers" (
  "id" uuid,
  "tier_name" text,
  "target_referrals" int,
  "reward_connects_per_referral" int,
  "expiry_days" int,
  "sort_order" int,
  "created_at" timestamptz,
  PRIMARY KEY (id)
);
create table legacy."bookings" (
  "id" uuid,
  "student_id" uuid,
  "teacher_id" uuid,
  "booking_type" text,
  "status" text,
  "scheduled_date" date,
  "scheduled_start_time" time,
  "scheduled_end_time" time,
  "description" text,
  "is_first_trial" boolean,
  "connects_charged" numeric,
  "rejection_reason" text,
  "created_at" timestamptz,
  "updated_at" timestamptz,
  "moderation_status" text,
  "overridden_by_admin" uuid,
  "override_reason" text,
  "overridden_at" timestamptz,
  PRIMARY KEY (id)
);
create table legacy."certification_applications" (
  "id" uuid,
  "teacher_id" uuid,
  "user_id" uuid,
  "status" text,
  "admin_notes" text,
  "reviewed_by" uuid,
  "reviewed_at" timestamptz,
  "created_at" timestamptz,
  PRIMARY KEY (id)
);
create table legacy."community_comments" (
  "id" uuid,
  "post_id" uuid,
  "user_id" uuid,
  "content" text,
  "status" text,
  "reviewed_by" uuid,
  "reviewed_at" timestamptz,
  "created_at" timestamptz,
  PRIMARY KEY (id)
);
create table legacy."community_post_loves" (
  "id" uuid,
  "post_id" uuid,
  "user_id" uuid,
  "session_id" text,
  "created_at" timestamptz,
  PRIMARY KEY (id)
);
create table legacy."community_posts" (
  "id" uuid,
  "user_id" uuid,
  "author_role" text,
  "category" text,
  "content_html" text,
  "content_plain" text,
  "image_url" text,
  "status" text,
  "reviewed_by" uuid,
  "reviewed_at" timestamptz,
  "love_count" int,
  "comment_count" int,
  "share_count" int,
  "is_pinned" boolean,
  "created_at" timestamptz,
  "updated_at" timestamptz,
  "bg_style" text,
  PRIMARY KEY (id)
);
create table legacy."competitor_intel" (
  "id" uuid,
  "kind" text,
  "query" text,
  "url" text,
  "title" text,
  "summary" text,
  "markdown" text,
  "links" jsonb,
  "metadata" jsonb,
  "raw" jsonb,
  "tags" text[],
  "created_by" uuid,
  "created_at" timestamptz,
  PRIMARY KEY (id)
);
create table legacy."concierge_assignments" (
  "id" uuid,
  "concierge_request_id" uuid,
  "teacher_id" uuid,
  "status" text,
  "rejection_reason" text,
  "assigned_at" timestamptz,
  "responded_at" timestamptz,
  "created_at" timestamptz,
  "overridden_by_admin" uuid,
  "override_reason" text,
  "overridden_at" timestamptz,
  PRIMARY KEY (id)
);
create table legacy."concierge_requests" (
  "id" uuid,
  "student_id" uuid,
  "academic_goals" text,
  "budget_negotiable" boolean,
  "location_preference" text,
  "learning_style" text[],
  "status" text,
  "created_at" timestamptz,
  "updated_at" timestamptz,
  "trial_topic" text,
  "preferred_days" text[],
  "preferred_time_start" text,
  "preferred_time_end" text,
  "preferred_teacher_quality" text[],
  "education_medium" text,
  "admin_notes" text,
  "recommended_teachers" uuid[],
  "connects_spent" numeric,
  "rematch_count" int,
  "budget_range_min" numeric,
  "budget_range_max" numeric,
  "moderation_status" text,
  PRIMARY KEY (id)
);
create table legacy."connect_packages" (
  "id" uuid,
  "name" text,
  "price_bdt" numeric,
  "base_connects" numeric,
  "bonus_percentage" numeric,
  "bonus_connects" numeric,
  "total_connects" numeric,
  "is_popular" boolean,
  "is_best_value" boolean,
  "is_active" boolean,
  "sort_order" int,
  "created_at" timestamptz,
  PRIMARY KEY (id)
);
create table legacy."contact_submissions" (
  "id" uuid,
  "full_name" text,
  "email" text,
  "phone" text,
  "subject" text,
  "message" text,
  "status" text,
  "created_at" timestamptz,
  "tsc_id" text,
  PRIMARY KEY (id)
);
create table legacy."contact_unlocks" (
  "id" uuid,
  "requester_id" uuid,
  "target_id" uuid,
  "is_unlocked" boolean,
  "status" text,
  "response_at" timestamptz,
  "response_notes" text,
  "connects_charged" numeric,
  "created_at" timestamptz,
  "overridden_by_admin" uuid,
  "override_reason" text,
  "overridden_at" timestamptz,
  PRIMARY KEY (id)
);
create table legacy."content_loves" (
  "id" uuid,
  "content_type" text,
  "content_id" uuid,
  "user_id" uuid,
  "session_id" text,
  "created_at" timestamptz,
  PRIMARY KEY (id)
);
create table legacy."content_moderation_queue" (
  "id" uuid,
  "content_type" text,
  "content_id" uuid,
  "field_name" text,
  "author_user_id" uuid,
  "original_text" text,
  "redacted_text" text,
  "detected_issues" jsonb,
  "severity" text,
  "status" text,
  "admin_action" text,
  "reviewed_by" uuid,
  "reviewed_at" timestamptz,
  "admin_notes" text,
  "created_at" timestamptz,
  "updated_at" timestamptz,
  "parent_deleted" boolean,
  "parent_hidden_until" timestamptz,
  "warning_issued" boolean,
  "suspension_applied" boolean,
  PRIMARY KEY (id)
);
create table legacy."disputes" (
  "id" uuid,
  "filed_by" uuid,
  "against_user" uuid,
  "booking_id" uuid,
  "reason" text,
  "status" text,
  "resolution_type" text,
  "resolution_notes" text,
  "resolved_by" uuid,
  "resolved_at" timestamptz,
  "appeal_text" text,
  "appeal_at" timestamptz,
  "created_at" timestamptz,
  "updated_at" timestamptz,
  PRIMARY KEY (id)
);
create table legacy."documents" (
  "id" uuid,
  "user_id" uuid,
  "document_type" text,
  "document_url" text,
  "file_name" text,
  "file_size" bigint,
  "file_hash" text,
  "verification_status" text,
  "verified_by" uuid,
  "verified_at" timestamptz,
  "rejection_reason" text,
  "created_at" timestamptz,
  PRIMARY KEY (id)
);
create table legacy."email_send_log" (
  "id" uuid,
  "message_id" text,
  "recipient_email" text,
  "recipient_user_id" uuid,
  "template_name" text,
  "subject" text,
  "status" text,
  "error_message" text,
  "sender_used" text,
  "metadata" jsonb,
  "created_at" timestamptz,
  "provider_message_id" text,
  "delivered_at" timestamptz,
  "bounced_at" timestamptz,
  "complained_at" timestamptz,
  "opened_at" timestamptz,
  "clicked_at" timestamptz,
  "last_event" text,
  "last_event_at" timestamptz,
  PRIMARY KEY (id)
);
create table legacy."email_webhook_events" (
  "id" uuid,
  "provider" text,
  "provider_message_id" text,
  "event_type" text,
  "recipient_email" text,
  "payload" jsonb,
  "signature_verified" boolean,
  "received_at" timestamptz,
  PRIMARY KEY (id)
);
create table legacy."free_materials" (
  "id" uuid,
  "user_id" uuid,
  "teacher_profile_id" uuid,
  "title" text,
  "description" text,
  "subject" text,
  "class_level" text,
  "file_url" text,
  "file_size" bigint,
  "status" text,
  "rejection_reason" text,
  "reviewed_by" uuid,
  "reviewed_at" timestamptz,
  "download_count" int,
  "created_at" timestamptz,
  "view_count" int,
  "love_count" int,
  "moderation_status" text,
  PRIMARY KEY (id)
);
create table legacy."gift_requests" (
  "id" uuid,
  "user_id" uuid,
  "request_type" text,
  "amount" int,
  "status" text,
  "admin_note" text,
  "created_at" timestamptz,
  "processed_at" timestamptz,
  "processed_by" uuid,
  "referral_code" text,
  "referee_id" uuid,
  PRIMARY KEY (id)
);
create table legacy."institution_alias_patterns" (
  "id" uuid,
  "institution_id" uuid,
  "pattern" text,
  "priority" int,
  "created_at" timestamptz,
  PRIMARY KEY (id)
);
create table legacy."institution_aliases" (
  "id" uuid,
  "canonical_name_en" text,
  "canonical_name_bn" text,
  "short_code" text,
  "tier" text,
  "sort_order" int,
  "is_active" boolean,
  "created_at" timestamptz,
  PRIMARY KEY (id)
);
create table legacy."knowledge_requests" (
  "id" uuid,
  "user_id" uuid,
  "requester_role" text,
  "requester_name" text,
  "email" text,
  "phone" text,
  "tsc_id" text,
  "education_level" text,
  "content_types" text[],
  "subject" text,
  "topic" text,
  "details" text,
  "deadline" date,
  "exam_context" text,
  "length_preference" text,
  "status" text,
  "assigned_admin_id" uuid,
  "linked_listing_id" uuid,
  "decline_reason" text,
  "admin_internal_notes" text,
  "notified_at" timestamptz,
  "created_at" timestamptz,
  "updated_at" timestamptz,
  PRIMARY KEY (id)
);
create table legacy."marketing_posts" (
  "id" uuid,
  "title" text,
  "content" text,
  "platform" text,
  "audience" text,
  "post_type" text,
  "is_published" boolean,
  "published_at" timestamptz,
  "created_by" uuid,
  "created_at" timestamptz,
  "updated_at" timestamptz,
  "image1_url" text,
  "image2_url" text,
  PRIMARY KEY (id)
);
create table legacy."match_outcomes" (
  "id" uuid,
  "student_id" uuid,
  "teacher_id" uuid,
  "trigger_type" text,
  "trigger_ref_id" uuid,
  "student_response" text,
  "teacher_response" text,
  "student_responded_at" timestamptz,
  "teacher_responded_at" timestamptz,
  "student_notes" text,
  "teacher_notes" text,
  "final_status" text,
  "admin_decision" text,
  "admin_notes" text,
  "resolved_by" uuid,
  "resolved_at" timestamptz,
  "auto_story_id" uuid,
  "fraud_flags" jsonb,
  "reminder_sent_count" int,
  "last_reminder_at" timestamptz,
  "created_at" timestamptz,
  "updated_at" timestamptz,
  "overridden_by_admin" uuid,
  "override_reason" text,
  "overridden_at" timestamptz,
  PRIMARY KEY (id)
);
create table legacy."mathsprint_answers" (
  "id" uuid,
  "attempt_id" uuid,
  "question_id" uuid,
  "selected_option" text,
  "is_correct" boolean,
  "answered_at" timestamptz,
  PRIMARY KEY (id)
);
create table legacy."mathsprint_attempts" (
  "id" uuid,
  "user_id" uuid,
  "registration_id" uuid,
  "edition" text,
  "tier" text,
  "started_at" timestamptz,
  "submitted_at" timestamptz,
  "total_time_seconds" int,
  "score" int,
  "total_questions" int,
  "status" text,
  "created_at" timestamptz,
  "flagged" boolean,
  "flagged_at" timestamptz,
  "flag_reason" text,
  "tab_switch_count" int,
  "valid_score" int,
  "fraud_events" jsonb,
  "raw_score" int,
  PRIMARY KEY (id)
);
create table legacy."mathsprint_badges" (
  "id" uuid,
  "user_id" uuid,
  "edition" text,
  "tier" text,
  "rank" int,
  "badge_type" text,
  "awarded_at" timestamptz,
  PRIMARY KEY (id)
);
create table legacy."mathsprint_editions" (
  "edition" text,
  "label" text,
  "starts_at" timestamptz,
  "ends_at" timestamptz,
  "is_published" boolean,
  "display_order" int,
  "created_at" timestamptz,
  "exam_start_at" timestamptz,
  "exam_end_at" timestamptz,
  "results_publish_at" timestamptz,
  "results_published" boolean,
  "results_published_at" timestamptz,
  PRIMARY KEY (edition)
);
create table legacy."mathsprint_email_dispatch_log" (
  "id" uuid,
  "edition" text,
  "tier" text,
  "user_id" uuid,
  "email_type" text,
  "rank" int,
  "sent_at" timestamptz,
  PRIMARY KEY (id)
);
create table legacy."mathsprint_questions" (
  "id" uuid,
  "edition" text,
  "tier" text,
  "question_order" int,
  "image_url" text,
  "correct_answer" text,
  "num_options" int,
  "created_by" uuid,
  "created_at" timestamptz,
  PRIMARY KEY (id)
);
create table legacy."mathsprint_registration_attempts" (
  "id" uuid,
  "user_id" uuid,
  "email" text,
  "full_name" text,
  "phone" text,
  "bkash_number" text,
  "tier" text,
  "current_class" text,
  "institution_name" text,
  "status" text,
  "failure_reason" text,
  "failure_message" text,
  "user_agent" text,
  "created_at" timestamptz,
  "edition" text,
  PRIMARY KEY (id)
);
create table legacy."mathsprint_registrations" (
  "id" uuid,
  "user_id" uuid,
  "student_profile_id" uuid,
  "tsc_id" text,
  "full_name" text,
  "current_class" text,
  "institution_name" text,
  "tier" text,
  "guardian_phone" text,
  "bkash_number" text,
  "favorite_math_topic" text,
  "education_medium" text,
  "status" text,
  "created_at" timestamptz,
  "edition" text,
  PRIMARY KEY (id)
);
create table legacy."notes_admin_members" (
  "user_id" uuid,
  "tsc_id" text,
  "promoted_by" uuid,
  "promoted_at" timestamptz,
  "status" text,
  "notes_published_count" int,
  "gift_sent_at" timestamptz,
  "notes" text,
  PRIMARY KEY (user_id)
);
create table legacy."notes_digitalization_jobs" (
  "id" uuid,
  "submission_id" uuid,
  "listing_id" uuid,
  "status" text,
  "source_pdf_path" text,
  "extracted_text" text,
  "ai_raw_response" jsonb,
  "ai_flags" jsonb,
  "ai_figure_fixes" jsonb,
  "polished_markdown" text,
  "docx_export_path" text,
  "docx_reimport_path" text,
  "final_pdf_path" text,
  "refund_amount_bdt" int,
  "refund_estimate_pct" int,
  "admin_notes" text,
  "prompt_override" text,
  "model_used" text,
  "error_message" text,
  "created_by" uuid,
  "created_at" timestamptz,
  "updated_at" timestamptz,
  "finalized_at" timestamptz,
  "final_markdown" text,
  "ux_score" int,
  "typography_score" int,
  "published_listing_id" uuid,
  PRIMARY KEY (id)
);
create table legacy."notes_digitalization_refunds" (
  "id" uuid,
  "job_id" uuid,
  "listing_id" uuid,
  "refund_pct" int,
  "refund_amount_bdt" int,
  "reason" text,
  "created_by" uuid,
  "created_at" timestamptz,
  "processed" boolean,
  "processed_at" timestamptz,
  PRIMARY KEY (id)
);
create table legacy."notes_earnings_ledger" (
  "id" uuid,
  "seller_user_id" uuid,
  "entry_type" text,
  "amount_bdt" int,
  "related_purchase_id" uuid,
  "related_payout_id" uuid,
  "note" text,
  "created_at" timestamptz,
  PRIMARY KEY (id)
);
create table legacy."notes_listings" (
  "id" uuid,
  "seller_user_id" uuid,
  "seller_tsc_id" text,
  "title" text,
  "description" text,
  "item_type" text,
  "subject" text,
  "class_level" text,
  "language" text,
  "pages" int,
  "price_bdt" int,
  "status" text,
  "cover_image_path" text,
  "full_pdf_path" text,
  "preview_pdf_path" text,
  "preview_page_numbers" int[],
  "rating_avg" numeric,
  "sales_count" int,
  "view_count" int,
  "love_count" int,
  "download_count" int,
  "featured" boolean,
  "rejection_reason" text,
  "approved_by" uuid,
  "approved_at" timestamptz,
  "created_at" timestamptz,
  "updated_at" timestamptz,
  "seller_proposed_price_bdt" int,
  "final_price_bdt" int,
  "seller_name_visible_choice" boolean,
  "admin_visibility_override" text,
  "admin_digitalized_at" timestamptz,
  "admin_uploaded_by" uuid,
  "note_serial" text,
  "is_admin_authored" boolean,
  "admin_byline" text,
  "note_code" text,
  "submitted_by_notes_admin" boolean,
  "verified_by_admin" boolean,
  "verified_at" timestamptz,
  "verified_by" uuid,
  PRIMARY KEY (id)
);
create table legacy."notes_loves" (
  "id" uuid,
  "listing_id" uuid,
  "reactor_session" text,
  "user_id" uuid,
  "created_at" timestamptz,
  PRIMARY KEY (id)
);
create table legacy."notes_payout_requests" (
  "id" uuid,
  "seller_user_id" uuid,
  "amount_bdt" int,
  "method" text,
  "recipient_number" text,
  "status" text,
  "admin_trx_id" text,
  "admin_notes" text,
  "processed_by" uuid,
  "processed_at" timestamptz,
  "created_at" timestamptz,
  PRIMARY KEY (id)
);
create table legacy."notes_purchases" (
  "id" uuid,
  "listing_id" uuid,
  "buyer_user_id" uuid,
  "seller_user_id" uuid,
  "amount_bdt" int,
  "seller_share_bdt" int,
  "platform_share_bdt" int,
  "bkash_trx_id" text,
  "status" text,
  "watermarked_pdf_path" text,
  "downloaded_at" timestamptz,
  "approved_by" uuid,
  "approved_at" timestamptz,
  "created_at" timestamptz,
  "buyer_name_snapshot" text,
  "buyer_tsc_id_snapshot" text,
  "buyer_email_snapshot" text,
  "buyer_phone_snapshot" text,
  "bkash_sender_number" text,
  "buyer_note" text,
  "purchase_share_pct" smallint,
  PRIMARY KEY (id)
);
create table legacy."notes_reviews" (
  "id" uuid,
  "listing_id" uuid,
  "buyer_user_id" uuid,
  "purchase_id" uuid,
  "rating" int,
  "comment" text,
  "is_approved" boolean,
  "created_at" timestamptz,
  "moderation_status" text,
  "rejection_reason" text,
  "moderated_at" timestamptz,
  "moderated_by" uuid,
  PRIMARY KEY (id)
);
create table legacy."notes_seller_limits" (
  "seller_tsc_id" text,
  "max_per_payout_bdt" int,
  "max_per_month_bdt" int,
  "min_payout_bdt" int,
  "notes" text,
  "set_by" uuid,
  "updated_at" timestamptz,
  "created_at" timestamptz,
  PRIMARY KEY (seller_tsc_id)
);
create table legacy."notes_submissions" (
  "id" uuid,
  "listing_id" uuid,
  "seller_user_id" uuid,
  "raw_file_paths" text[],
  "digitalization_status" text,
  "assigned_admin" uuid,
  "internal_notes" text,
  "created_at" timestamptz,
  "updated_at" timestamptz,
  PRIMARY KEY (id)
);
create table legacy."notes_view_log" (
  "id" uuid,
  "listing_id" uuid,
  "viewer_user_id" uuid,
  "session_token" text,
  "created_at" timestamptz,
  PRIMARY KEY (id)
);
create table legacy."online_certification_applications" (
  "id" uuid,
  "user_id" uuid,
  "teacher_id" uuid,
  "teaching_demo_link" text,
  "tech_setup_notes" text,
  "checklist_scores" jsonb,
  "status" text,
  "admin_notes" text,
  "reviewed_by" uuid,
  "reviewed_at" timestamptz,
  "created_at" timestamptz,
  "updated_at" timestamptz,
  PRIMARY KEY (id)
);
create table legacy."payment_info_submissions" (
  "id" uuid,
  "user_id" uuid,
  "tsc_id" text,
  "transaction_id" text,
  "sender_number" text,
  "amount_bdt" numeric,
  "connects_expected" int,
  "payment_ref" text,
  "status" text,
  "admin_note" text,
  "processed_by" uuid,
  "processed_at" timestamptz,
  "created_at" timestamptz,
  PRIMARY KEY (id)
);
create table legacy."payments" (
  "id" uuid,
  "user_id" uuid,
  "transaction_type" text,
  "amount_connects" numeric,
  "amount_bdt" numeric,
  "payment_status" text,
  "payment_gateway" text,
  "gateway_transaction_id" text,
  "reference_id" uuid,
  "metadata" jsonb,
  "created_at" timestamptz,
  PRIMARY KEY (id)
);
create table legacy."pending_profile_changes" (
  "id" uuid,
  "user_id" uuid,
  "change_data" jsonb,
  "status" text,
  "reviewed_by" uuid,
  "reviewed_at" timestamptz,
  "created_at" timestamptz,
  PRIMARY KEY (id)
);
create table legacy."platform_settings" (
  "id" uuid,
  "key" text,
  "value" jsonb,
  "description" text,
  "updated_by" uuid,
  "updated_at" timestamptz,
  PRIMARY KEY (id)
);
create table legacy."portfolio_leads" (
  "id" uuid,
  "teacher_id" uuid,
  "resource_id" uuid,
  "name" text,
  "phone" text,
  "email" text,
  "source" text,
  "user_agent" text,
  "captured_at" timestamptz,
  PRIMARY KEY (id)
);
create table legacy."profile_audit_log" (
  "id" uuid,
  "table_name" text,
  "user_id" uuid,
  "profile_id" uuid,
  "changed_by" uuid,
  "before_data" jsonb,
  "after_data" jsonb,
  "changed_fields" text[],
  "created_at" timestamptz,
  PRIMARY KEY (id)
);
create table legacy."profile_boosts" (
  "id" uuid,
  "teacher_id" uuid,
  "tier" text,
  "connects_spent" numeric,
  "started_at" timestamptz,
  "expires_at" timestamptz,
  "is_active" boolean,
  "created_at" timestamptz,
  PRIMARY KEY (id)
);
create table legacy."profile_upgrades" (
  "id" uuid,
  "teacher_id" uuid,
  "connects_spent" numeric,
  "is_active" boolean,
  "created_at" timestamptz,
  PRIMARY KEY (id)
);
create table legacy."profile_view_logs" (
  "id" uuid,
  "teacher_id" uuid,
  "viewer_id" uuid,
  "viewed_at" timestamptz,
  "source" text,
  PRIMARY KEY (id)
);
create table legacy."referrals" (
  "id" uuid,
  "referrer_id" uuid,
  "referee_id" uuid,
  "referral_code" text,
  "status" text,
  "reward_given" boolean,
  "reward_connects" numeric,
  "created_at" timestamptz,
  PRIMARY KEY (id)
);
create table legacy."reviews" (
  "id" uuid,
  "student_id" uuid,
  "teacher_id" uuid,
  "booking_id" uuid,
  "overall_rating" numeric,
  "teaching_quality" numeric,
  "communication" numeric,
  "punctuality" numeric,
  "review_text" text,
  "is_approved" boolean,
  "approved_by" uuid,
  "approved_at" timestamptz,
  "created_at" timestamptz,
  "reviewer_role" text,
  "success_story" text,
  "result_achievement" text,
  "student_class" text,
  "is_featured" boolean,
  "is_story_approved" boolean,
  "moderation_status" text,
  PRIMARY KEY (id)
);
create table legacy."saved_teachers" (
  "id" uuid,
  "student_id" uuid,
  "teacher_id" uuid,
  "created_at" timestamptz,
  PRIMARY KEY (id)
);
create table legacy."security_alerts" (
  "id" uuid,
  "user_id" uuid,
  "risk_score" int,
  "severity" text,
  "category" text,
  "signals" jsonb,
  "ai_reasoning" text,
  "recommended_action" text,
  "status" text,
  "reviewed_by" uuid,
  "reviewed_at" timestamptz,
  "admin_notes" text,
  "created_at" timestamptz,
  "updated_at" timestamptz,
  PRIMARY KEY (id)
);
create table legacy."service_pricing" (
  "id" uuid,
  "service_type" text,
  "description_bn" text,
  "description_en" text,
  "connects_amount" numeric,
  "bdt_equivalent" numeric,
  "is_active" boolean,
  "created_at" timestamptz,
  "updated_at" timestamptz,
  PRIMARY KEY (id)
);
create table legacy."student_free_events" (
  "id" uuid,
  "name" text,
  "name_bn" text,
  "occasion" text,
  "starts_at" timestamptz,
  "ends_at" timestamptz,
  "is_active" boolean,
  "banner_message_bn" text,
  "banner_message_en" text,
  "created_at" timestamptz,
  "created_by" uuid,
  PRIMARY KEY (id)
);
create table legacy."success_stories" (
  "id" uuid,
  "user_id" uuid,
  "title" text,
  "content" text,
  "image_url" text,
  "is_approved" boolean,
  "approved_by" uuid,
  "approved_at" timestamptz,
  "created_at" timestamptz,
  "rating" int,
  "achievement" text,
  "moderation_status" text,
  PRIMARY KEY (id)
);
create table legacy."super_admin_telegram_subscribers" (
  "id" uuid,
  "user_id" uuid,
  "chat_id" text,
  "label" text,
  "is_active" boolean,
  "created_at" timestamptz,
  "updated_at" timestamptz,
  PRIMARY KEY (id)
);
create table legacy."teacher_availability" (
  "id" uuid,
  "teacher_id" uuid,
  "day_of_week" int,
  "start_time" time,
  "end_time" time,
  "is_active" boolean,
  "created_at" timestamptz,
  PRIMARY KEY (id)
);
create table legacy."teacher_blocked_dates" (
  "id" uuid,
  "teacher_id" uuid,
  "blocked_date" date,
  "reason" text,
  "created_at" timestamptz,
  PRIMARY KEY (id)
);
create table legacy."teacher_custom_domains" (
  "id" uuid,
  "teacher_id" uuid,
  "domain" text,
  "status" text,
  "dns_verified_at" timestamptz,
  "ssl_provisioned_at" timestamptz,
  "expires_at" timestamptz,
  "admin_notes" text,
  "created_at" timestamptz,
  "updated_at" timestamptz,
  PRIMARY KEY (id)
);
create table legacy."teacher_faqs" (
  "id" uuid,
  "teacher_id" uuid,
  "question" text,
  "answer" text,
  "sort_order" int,
  "is_approved" boolean,
  "created_at" timestamptz,
  "updated_at" timestamptz,
  PRIMARY KEY (id)
);
create table legacy."teacher_free_resources" (
  "id" uuid,
  "teacher_id" uuid,
  "title" text,
  "description" text,
  "pdf_path" text,
  "cover_image_url" text,
  "downloads_count" int,
  "requires_lead_capture" boolean,
  "sort_order" int,
  "created_at" timestamptz,
  "updated_at" timestamptz,
  PRIMARY KEY (id)
);
create table legacy."teacher_hand_raises" (
  "id" uuid,
  "post_id" uuid,
  "teacher_id" uuid,
  "user_id" uuid,
  "message" text,
  "raised_at" timestamptz,
  "moderation_status" text,
  PRIMARY KEY (id)
);
create table legacy."teacher_needed_email_log" (
  "id" uuid,
  "post_id" uuid,
  "teacher_id" uuid,
  "recipient_email" text,
  "status" text,
  "error" text,
  "sent_at" timestamptz,
  PRIMARY KEY (id)
);
create table legacy."teacher_needed_posts" (
  "id" uuid,
  "student_id" uuid,
  "user_id" uuid,
  "subjects" text[],
  "preferred_gender" text,
  "teaching_mode" text,
  "hourly_rate_online" int,
  "monthly_rate_offline" int,
  "rate_negotiable" boolean,
  "district" text,
  "thana" text,
  "preferred_days" text[],
  "time_slots" text[],
  "preferred_institution" text,
  "preferred_department" text,
  "min_experience_years" int,
  "additional_notes" text,
  "is_active" boolean,
  "expires_at" timestamptz,
  "created_at" timestamptz,
  "moderation_status" text,
  "posted_by" text,
  "admin_note" text,
  "matched_teacher_id" uuid,
  "matched_at" timestamptz,
  "send_alerts" boolean,
  "alert_subject_match" boolean,
  "alert_mode_match" boolean,
  "alerts_dispatched_at" timestamptz,
  "alerts_sent_count" int,
  "alerts_failed_count" int,
  "student_class" text,
  "curriculum" text,
  PRIMARY KEY (id)
);
create table legacy."teacher_premium_subscriptions" (
  "id" uuid,
  "teacher_id" uuid,
  "tier" text,
  "started_at" timestamptz,
  "expires_at" timestamptz,
  "amount_bdt" numeric,
  "trx_id" text,
  "status" text,
  "created_at" timestamptz,
  "updated_at" timestamptz,
  PRIMARY KEY (id)
);
create table legacy."teacher_pride_stories" (
  "id" uuid,
  "teacher_id" uuid,
  "user_id" uuid,
  "student_name" text,
  "achievement_type" text,
  "institution_name" text,
  "department_or_subject" text,
  "batch_or_year" text,
  "position_or_grade" text,
  "teacher_note" text,
  "status" text,
  "rejection_reason" text,
  "approved_by" uuid,
  "approved_at" timestamptz,
  "created_at" timestamptz,
  "updated_at" timestamptz,
  PRIMARY KEY (id)
);
create table legacy."teacher_student_results" (
  "id" uuid,
  "teacher_id" uuid,
  "student_name" text,
  "grade" text,
  "board" text,
  "year" int,
  "story" text,
  "image_url" text,
  "sort_order" int,
  "created_at" timestamptz,
  "updated_at" timestamptz,
  PRIMARY KEY (id)
);
create table legacy."teacher_teaching_philosophy" (
  "id" uuid,
  "teacher_id" uuid,
  "icon" text,
  "title" text,
  "description" text,
  "sort_order" int,
  "created_at" timestamptz,
  "updated_at" timestamptz,
  PRIMARY KEY (id)
);
create table legacy."teacher_video_intros" (
  "id" uuid,
  "teacher_id" uuid,
  "video_url" text,
  "file_size" bigint,
  "is_approved" boolean,
  "approved_by" uuid,
  "approved_at" timestamptz,
  "created_at" timestamptz,
  "love_count" int,
  PRIMARY KEY (id)
);
create table legacy."teacher_video_library" (
  "id" uuid,
  "teacher_id" uuid,
  "title" text,
  "video_url" text,
  "thumbnail_url" text,
  "subject" text,
  "description" text,
  "sort_order" int,
  "created_at" timestamptz,
  "updated_at" timestamptz,
  PRIMARY KEY (id)
);
create table legacy."teaching_style_images" (
  "id" uuid,
  "teacher_id" uuid,
  "image_url" text,
  "caption" text,
  "sort_order" int,
  "created_at" timestamptz,
  "is_approved" boolean,
  "approved_by" uuid,
  "approved_at" timestamptz,
  "love_count" int,
  PRIMARY KEY (id)
);
create table legacy."testimonial_screenshots" (
  "id" uuid,
  "audience" text,
  "image_url" text,
  "caption_bn" text,
  "caption_en" text,
  "source_label" text,
  "gradient_key" text,
  "display_order" int,
  "is_active" boolean,
  "created_by" uuid,
  "created_at" timestamptz,
  "updated_at" timestamptz,
  PRIMARY KEY (id)
);
create table legacy."text_intelligence_log" (
  "id" uuid,
  "author_user_id" uuid,
  "author_role" text,
  "author_tsc_id" text,
  "author_full_name" text,
  "content_type" text,
  "content_id" uuid,
  "field_name" text,
  "original_text" text,
  "normalized_text" text,
  "text_length" int,
  "tier" text,
  "final_score" int,
  "signal_scores" jsonb,
  "ai_reasoning" text,
  "detected_keywords" text[],
  "recipient_user_id" uuid,
  "classified_by" text,
  "admin_action" text,
  "admin_action_by" uuid,
  "admin_action_at" timestamptz,
  "admin_notes" text,
  "created_at" timestamptz,
  "anon_identifier" text,
  PRIMARY KEY (id)
);
create table legacy."tsci_knowledge_entries" (
  "id" uuid,
  "topic" text,
  "content_en" text,
  "content_bn" text,
  "category" text,
  "is_active" boolean,
  "sort_order" int,
  "created_at" timestamptz,
  "updated_at" timestamptz,
  "created_by" uuid,
  "notion_page_id" text,
  "last_synced_at" timestamptz,
  PRIMARY KEY (id)
);
create table legacy."tuition_requests" (
  "id" uuid,
  "student_id" uuid,
  "subject" text,
  "class_level" text,
  "preferred_mode" text,
  "district" text,
  "thana" text,
  "budget_min" numeric,
  "budget_max" numeric,
  "budget_negotiable" boolean,
  "preferred_days" text[],
  "preferred_time_start" text,
  "preferred_time_end" text,
  "description" text,
  "is_active" boolean,
  "created_at" timestamptz,
  "updated_at" timestamptz,
  "education_medium" text,
  "moderation_status" text,
  PRIMARY KEY (id)
);
create table legacy."tutorial_videos" (
  "id" uuid,
  "audience" text,
  "title_bn" text,
  "title_en" text,
  "caption_bn" text,
  "caption_en" text,
  "description_bn" text,
  "description_en" text,
  "thumbnail_url" text,
  "youtube_url" text,
  "gradient_key" text,
  "cta_label_bn" text,
  "cta_label_en" text,
  "display_order" int,
  "is_featured" boolean,
  "is_active" boolean,
  "view_count" int,
  "love_count" int,
  "created_by" uuid,
  "created_at" timestamptz,
  "updated_at" timestamptz,
  PRIMARY KEY (id)
);
