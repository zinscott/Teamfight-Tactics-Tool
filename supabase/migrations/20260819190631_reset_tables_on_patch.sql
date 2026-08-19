create or replace function reset_patch_data() returns void as $$
begin
    truncate match_participants, match_history,
             unit_stats, item_stats, item_pair_stats, full_build_stats;
    delete from tracked_summoners where tier is null;
end;
$$ language plpgsql;