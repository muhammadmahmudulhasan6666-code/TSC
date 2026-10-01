-- Must commit before 20261001000900 uses it (Postgres: new enum values can't be used in the same transaction).
alter type public.payment_request_status add value if not exists 'refund_due';
