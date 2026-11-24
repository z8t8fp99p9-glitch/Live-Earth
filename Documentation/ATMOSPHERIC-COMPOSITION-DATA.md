# LIVE // EARTH — Atmospheric Composition Data

**View:** `atmospheric-composition`  
**Controller:** `Atmospheric-Composition/atmospheric-composition-view-controller.js`  
**Current-value store:** `Data/Central-Database/values/<dataset_id>/`

Atmospheric Composition is a separate numerical-style Stacks view. Its controller defines seven selectable fields, loads the selected dataset's current grid through `LiveEarthUniversalGridSystem.loadCurrentGrid()`, checks the shared 1440 × 721 grid and valid-cell count, and attaches one active GPU grid layer to its own Earth Engine globe. It does not use sample values or generate missing cells.

## Seven selectable fields

| Layer | Dataset ID | Provider/product variable | Scientific meaning | Units |
|---|---|---|---|---|
| Water Vapour | `earth.atmosphere.water_vapour` | NOAA/NCEP GFS · `PWAT` | Total-column precipitable water; integrated water vapour, not 2 m relative humidity | kg/m² |
| Cloud Properties | `earth.atmosphere.cloud_properties` | NOAA/NCEP GFS · `TCDC` | Total cloud cover; not a complete cloud-microphysics profile | % |
| Carbon Dioxide | `earth.atmosphere.co2_concentration` | NASA GEOS-CF v2 · `xco2` | Column-averaged dry-air CO₂ mole fraction | ppm |
| Methane | `earth.atmosphere.methane` | NASA GEOS-CF v2 · `xch4` | Column-averaged dry-air methane mole fraction | ppb |
| Ozone | `earth.atmosphere.ozone` | NOAA/NCEP GFS · `TOZNE` | Total-column ozone; not a vertical ozone profile | Dobson units |
| Carbon Monoxide | `earth.atmosphere.carbon_monoxide` | NASA GEOS-CF v2 · `co` | Near-surface dry-air CO mole fraction from the surface product | ppb |
| Aerosols / Dust | `earth.atmosphere.aerosols_dust` | NASA GEOS-CF v2 · `pm25du_rh35` | Dust contribution to PM2.5 at RH 35%; not total aerosol optical depth or total dust loading | µg/m³ |

## Source interpretation

- NOAA fields are GFS forecast-model fields downloaded from NOMADS. They are not direct satellite or instrument observations. The adapter requests the appropriate GRIB2 field/level and validates the decoded global grid.
- NASA fields come from GEOS-CF v2 OpenDAP products. CO₂ and methane are column averages; carbon monoxide uses the surface-level product; the dust layer specifically represents the `pm25du_rh35` contribution to PM2.5 at 35% relative humidity.
- All seven fields use the shared 1440 × 721 global regular grid at the current-value storage boundary. Their metadata records product/source, units, valid/observed time, retrieval time, encoding, quality status and checksums.
- The reviewed `main` checkpoint contains `metadata.json` and `values.bin` for all seven IDs. Metadata quality is labelled `downloaded_and_grid_validated`. This proves a stored validated current field, not complete or newly published source coverage on every refresh.
- Missing source cells are not interpolated or gap-filled by the adapter.

## View loading and interaction

The controller's seven options are selected from the Composition dataset orb menu. Selecting one loads current values through the shared Universal Grid System, validates dimensions and available cells, updates the legend/provenance and attaches the selected field to the Composition-owned globe. Selecting the active option again removes its layer. Switching fields aborts the prior request and disposes its layer before loading the next. Closing the view aborts pending requests and disposes the globe/layer resources.

The three NOAA grid layers and four NASA grid layers are selectable in the current controller. Older instructions that described CO₂, methane, CO and aerosols/dust as disabled candidates, or said that no Composition adapter was connected, are superseded.

## Known registry assignment mismatch

The controller's seven options load these stable dataset IDs directly. However, the two Universal World registries do not yet express that relationship consistently:

- `worlds.json` contains `atmospheric_composition` with status `active_no_dataset_assignments`.
- `world-dataset-assignments.json` assigns all seven Composition dataset IDs to `world_id: "atmosphere"` rather than `atmospheric_composition`.

This is a real metadata consistency issue, but it does not remove the controller's direct current-value read path. It is recorded here for a separately scoped source correction; this documentation update does not change the registry, data or controller.

## Related contracts

- [`ATMOSPHERE-FOUR-FIELD-UNIVERSAL-CONNECTION.md`](ATMOSPHERE-FOUR-FIELD-UNIVERSAL-CONNECTION.md) — Atmosphere's four controls/five IDs.
- [`SCIENTIFIC-DATA-COLLECTION.md`](SCIENTIFIC-DATA-COLLECTION.md) — current-value collection, freshness and run status.
- [`NUMERICAL-WORLD-GRID-SKIN-LIFECYCLE.md`](NUMERICAL-WORLD-GRID-SKIN-LIFECYCLE.md) — shared Engine/grid lifecycle.
