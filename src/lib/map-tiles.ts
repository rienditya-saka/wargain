// Free raster basemaps with no API key: OpenStreetMap standard tiles, falling back to
// the OSM France "HOT" style if they keep failing. The dark variant reuses the same tiles
// with a CSS filter (.wargain-tiles-dark in globals.css).
// Note: CARTO basemaps now return an "API KEY REQUIRED" watermark tile (still HTTP 200).
// OSM tile usage policy: keep the attribution visible and avoid bulk/offline downloads.
// To switch provider later (MapTiler, Stadia, self-hosted), change it here only.

export type BaseMapVariant = "light" | "dark";

const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';

const PRIMARY = {
  url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution: OSM_ATTRIBUTION,
  maxZoom: 19,
};

const FALLBACK = {
  url: "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
  subdomains: "abc",
  attribution: `${OSM_ATTRIBUTION}, tiles <a href="https://www.hotosm.org/" target="_blank" rel="noopener">HOT</a> / OSM France`,
  maxZoom: 19,
};

const FALLBACK_AFTER_ERRORS = 6;

// Adds the base layer and a compact attribution control (bottom-left, away from the zoom buttons).
export function addBaseLayer(L: any, map: any, variant: BaseMapVariant = "light") {
  L.control.attribution({ position: "bottomleft", prefix: false }).addTo(map);
  map.setMaxZoom?.(PRIMARY.maxZoom);

  const className = variant === "dark" ? "wargain-tiles-dark" : "";
  const layer = L.tileLayer(PRIMARY.url, { maxZoom: PRIMARY.maxZoom, attribution: PRIMARY.attribution, className });

  let errors = 0;
  let switched = false;
  layer.on("tileerror", () => {
    errors += 1;
    if (switched || errors < FALLBACK_AFTER_ERRORS) return;
    switched = true;
    map.removeLayer(layer);
    L.tileLayer(FALLBACK.url, {
      subdomains: FALLBACK.subdomains,
      maxZoom: FALLBACK.maxZoom,
      attribution: FALLBACK.attribution,
      className,
    }).addTo(map);
  });

  layer.addTo(map);
  return layer;
}
