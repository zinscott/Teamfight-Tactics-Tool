CREATE TABLE patch_number (
    id int primary key default 1,
    current_patch text,
    updated_at timestamptz not null default now()
);
insert into patch_number (id, current_patch) values (1,null);