create or replace function public.increment_equity_report_download(p_id uuid)
returns void language sql as $$
  update equity_report_purchases
  set download_count = download_count + 1,
      last_downloaded_at = now()
  where id = p_id;
$$;
