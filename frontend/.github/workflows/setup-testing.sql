create extension pgtap with schema extensions;

/*---------------------
---- install dbdev ----
----------------------
Requires:
  - pg_tle: https://github.com/aws/pg_tle
  - pgsql-http: https://github.com/pramsey/pgsql-http
*/
create extension if not exists http with schema extensions;
create extension if not exists pg_tle;
drop extension if exists "supabase-dbdev";
select pgtle.uninstall_extension_if_exists('supabase-dbdev');
select
    pgtle.install_extension(
        'supabase-dbdev',
        resp.contents ->> 'version',
        'PostgreSQL package manager',
        resp.contents ->> 'sql'
    )
from http(
    (
        'GET',
        'https://api.database.dev/rest/v1/'
        || 'package_versions?select=sql,version'
        || '&package_name=eq.supabase-dbdev'
        || '&order=version.desc'
        || '&limit=1',
        array[
            (
                'apiKey',
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJp'
                || 'c3MiOiJzdXBhYmFzZSIsInJlZiI6InhtdXB0cHBsZnZpaWZyY'
                || 'ndtbXR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODAxMDczNzI'
                || 'sImV4cCI6MTk5NTY4MzM3Mn0.z2CN0mvO2No8wSi46Gw59DFGCTJ'
                || 'rzM0AQKsu_5k134s'
            )::http_header
        ],
        null,
        null
    )
) x,
lateral (
    select
        ((row_to_json(x) -> 'content') #>> '{}')::json -> 0
) resp(contents);
create extension "supabase-dbdev";
select dbdev.install('supabase-dbdev');
drop extension if exists "supabase-dbdev";
create extension "supabase-dbdev";

select dbdev.install('basejump-supabase_test_helpers');
