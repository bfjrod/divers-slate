-- View that exposes shop coordinates as plain lat/lng columns
-- Used by the map homepage to avoid PostGIS function calls in the app layer
create or replace view shops_geo as
  select
    id,
    name,
    slug,
    city,
    state,
    st_y(location::geometry) as lat,
    st_x(location::geometry) as lng
  from shops
  where location is not null;
