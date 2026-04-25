-- Atomic JSONB append for chat messages (avoids concurrent-write lost-message race)
create or replace function public.append_equity_report_chat(p_purchase uuid, p_msg jsonb)
returns void language sql as $$
  insert into equity_report_chats (purchase_id, messages, message_count, last_message_at)
  values (p_purchase, jsonb_build_array(p_msg), 1, now())
  on conflict (purchase_id) do update
  set messages = equity_report_chats.messages || excluded.messages,
      message_count = equity_report_chats.message_count + 1,
      last_message_at = now();
$$;

create unique index if not exists idx_erc_unique_purchase on equity_report_chats (purchase_id);
