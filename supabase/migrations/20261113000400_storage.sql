-- Storage buckets (Architecture §12: type and size checks on uploads).
-- Menu images are public (served via CDN); uploads go through /api/menu/images, which
-- checks the staff role and writes with the service role under <tenant>/<outlet>/.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('menu-images', 'menu-images', true, 5 * 1024 * 1024, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do nothing;

-- Invoices are private; the app streams them to authorised viewers.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('invoices', 'invoices', false, 2 * 1024 * 1024, array['application/pdf'])
on conflict (id) do nothing;
