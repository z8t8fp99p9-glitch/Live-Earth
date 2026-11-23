from __future__ import annotations

"""Additional NOAA/NASA Ocean datasets.

This adapter is deliberately separate from ocean_fixed: the six established
Ocean layers continue to use their existing adapter and source definitions.
Three additions use the shared, validated ERDDAP grid path; the monthly
0–2000 m heat-content anomaly uses a small dedicated CF-NetCDF decoder.
"""

import datetime as dt
import json
import os
import tempfile
from pathlib import Path
from email.utils import parsedate_to_datetime

import numpy as np
import xarray as xr

from . import ocean as _ocean
from . import ocean_fixed as _ocean_fixed  # installs the established strict ERDDAP pipeline

UTC = dt.timezone.utc
HEAT_URL = (
    "https://www.ncei.noaa.gov/data/oceans/woa/DATA_ANALYSIS/"
    "3M_HEAT_CONTENT/NETCDF/heat_content/"
    "heat_content_anomaly_0-2000_monthly.nc"
)
HEAT_SOURCE_ID = "noaa_ncei_ohc_0_2000_monthly"

# These are added without changing any of the six established specifications.
_ocean.DATASETS.update({
    "earth.oceans.ocean_colour": {
        "kind": "erddap",
        "dataset_id": "erdMH1cflh1day_R2022NRT",
        "base": "https://coastwatch.pfeg.noaa.gov/erddap",
        "variables": ("nflh",),
        "extra_dims": (),
        "source_id": "nasa_aqua_modis_fluorescence_line_height",
        "cadence": "daily",
        "units": "W m-2 um-1 sr-1",
        "scale": 1000,
        "valid_min": 0.0,
        "valid_max": 5.0,
        "max_age_days": 30,
        "stride": 3,
        "expected_native_spacing_degrees": 1.0 / 24.0,
        "provider": "NASA Goddard Space Flight Center Ocean Biology Processing Group",
        "product": "Aqua MODIS Level-3 mapped normalized fluorescence line height, R2022 NRT, global 4 km daily",
        "description": "NASA Aqua MODIS normalized fluorescence line height (nFLH), a satellite ocean-optics fluorescence indicator. It is not spectral remote-sensing reflectance and is not a chlorophyll concentration. LIVE // EARTH samples every third native 4 km cell to the existing 0.125-degree renderer grid; no interpolation or gap filling is performed.",
        "field_label": "Normalized fluorescence line height",
    },
    "earth.oceans.marine_productivity": {
        "kind": "erddap",
        "dataset_id": "productivity_viirs_noaa20_daily_nrt",
        "base": "https://coastwatch.pfeg.noaa.gov/erddap",
        "variables": ("productivity",),
        "extra_dims": (),
        "source_id": "noaa_coastwatch_viirs_noaa20_productivity_daily",
        "cadence": "daily",
        "units": "mg C m-2 day-1",
        "scale": 10,
        "valid_min": 0.0,
        "valid_max": 2000.0,
        "max_age_days": 14,
        "stride": 3,
        "expected_native_spacing_degrees": 1.0 / 24.0,
        "provider": "NOAA CoastWatch West Coast Node",
        "product": "VIIRS NOAA-20 primary productivity, near-real-time, global 4 km daily",
        "description": "NOAA CoastWatch VIIRS NOAA-20 estimate of net primary production of carbon, calculated from chlorophyll-a, photosynthetically available radiation, and sea-surface temperature inputs. LIVE // EARTH samples every third native 4 km cell to the existing 0.125-degree renderer grid; no interpolation or gap filling is performed.",
        "field_label": "Net primary productivity of carbon",
    },
    "earth.oceans.sea_ice": {
        "kind": "erddap",
        "dataset_id": "ncdcOisst21Agg_LonPM180",
        "base": "https://upwell.pfeg.noaa.gov/erddap",
        "variables": ("ice",),
        "extra_dims": ("zlev",),
        "source_id": "noaa_ncei_oisst21_sea_ice_fraction",
        "cadence": "daily",
        "units": "1",
        "scale": 10000,
        "valid_min": 0.0,
        "valid_max": 1.0,
        "max_age_days": 30,
        "stride": 1,
        "expected_native_spacing_degrees": 0.25,
        "provider": "NOAA National Centers for Environmental Information",
        "product": "NOAA NCEI OISST v2.1 AVHRR-only final sea-ice concentration fraction, global 0.25 degree",
        "description": "Sea-ice area fraction supplied as the ice variable in NOAA NCEI OISST v2.1. Values remain fractions from 0 to 1; the existing 0.25-degree source grid is retained without interpolation.",
        "field_label": "Sea ice concentration fraction",
    },
    "earth.oceans.ocean_heat": {
        "kind": "ncei_netcdf",
        "dataset_id": "earth.oceans.ocean_heat",
        "source_id": HEAT_SOURCE_ID,
        "cadence": "monthly",
        "units": "10^18 J",
        "scale": 100,
        "valid_min": -300.0,
        "valid_max": 300.0,
        "max_age_days": 210,
        "stride": 1,
        "provider": "NOAA National Centers for Environmental Information",
        "product": "Global monthly ocean heat content anomaly, 0–2000 m, 1-degree analyzed fields",
        "description": "NOAA NCEI monthly globally analyzed ocean heat-content anomaly integrated over 0–2000 m. The source field is retained on its native 1-degree latitude/longitude grid; no interpolation or regridding is performed.",
        "field_label": "Ocean heat content anomaly, 0–2000 m",
    },
})

# The two 4 km ERDDAP sources serialize their coordinate axes as float32.
# Their reported "uneven" spacing is small coordinate roundoff, not a different
# projection. Permit that roundoff only for these full-resolution axis sizes;
# all other axes continue through the original strict selector unchanged.
_original_axis_selector = _ocean._axis_selector


def _axis_selector_with_4km_roundoff(axis: np.ndarray, stride: int):
    source = np.asarray(axis, dtype=np.float64)
    if source.size not in (4320, 8640):
        return _original_axis_selector(axis, stride)
    if not isinstance(stride, (int, np.integer)) or stride < 1:
        raise ValueError("Grid sampling stride must be a positive integer")
    if source.ndim != 1 or source.size < 2 or not np.all(np.isfinite(source)):
        raise RuntimeError("Source coordinate axis is not a usable one-dimensional grid")
    delta = np.diff(source)
    if (not np.all(np.isfinite(delta)) or np.any(delta == 0)
            or not (np.all(delta > 0) or np.all(delta < 0))):
        raise RuntimeError("Source coordinate axis is not strictly monotonic")
    selected = source[::int(stride)]
    if selected.size < 2:
        raise RuntimeError("Sampling stride leaves fewer than two grid coordinates")
    sampled_step = float(np.median(delta)) * int(stride)
    if not np.allclose(
        np.diff(selected), sampled_step, rtol=0.0,
        # The native ERDDAP axis has already passed ocean_fixed's monotonicity
        # and 0.2%-of-cell spacing checks. Every-third-point differences can
        # accumulate that float32 coordinate noise across three source cells.
        atol=max(1e-4, abs(sampled_step) * 2e-3),
    ):
        raise RuntimeError("Sampled coordinate axis is materially irregular; refusing to resample")
    return (
        f"[({_ocean_fixed._number(selected[0])}):{int(stride)}:({_ocean_fixed._number(selected[-1])})]",
        selected,
    )


_ADDITIONAL_ERDDAP_SOURCE_IDS = {
    "nasa_aqua_modis_fluorescence_line_height",
    "noaa_coastwatch_viirs_noaa20_productivity_daily",
}


# The ERDDAP CSV axis endpoint serializes coordinates independently from the
# NetCDF response. For these 4 km products that can introduce float32 rounding
# offsets greater than the generic decoder's 1e-6 exactness threshold. Validate
# the returned NetCDF axes against the requested sample using the same strict,
# sub-cell tolerance as the established ocean_fixed adapter, then pass the
# actual NetCDF coordinates into the generic decoder so it compares like with
# like. This does not alter or relax any of the six established datasets.
_original_request_erddap = _ocean._request_erddap


def _request_erddap_with_4km_coordinate_validation(
    spec: dict, timestamp: dt.datetime, variable: str
):
    raw, url, requested_lat, requested_lon = _original_request_erddap(
        spec, timestamp, variable
    )
    if spec.get("source_id") not in _ADDITIONAL_ERDDAP_SOURCE_IDS:
        return raw, url, requested_lat, requested_lon

    fd, path = tempfile.mkstemp(suffix=".nc")
    try:
        with os.fdopen(fd, "wb") as stream:
            stream.write(raw)
        with xr.open_dataset(
            path, engine="netcdf4", decode_cf=True, mask_and_scale=True
        ) as ds:
            if "latitude" not in ds.variables or "longitude" not in ds.variables:
                raise RuntimeError(
                    f"Returned {spec['product']} NetCDF is missing latitude/longitude coordinates"
                )
            def validate_axis(requested, returned, axis_name):
                expected = np.asarray(requested, dtype=np.float64).reshape(-1)
                actual = np.asarray(returned, dtype=np.float64).reshape(-1)
                if actual.size != expected.size or actual.size < 2 or not np.all(np.isfinite(actual)):
                    raise RuntimeError(
                        f"Returned {axis_name} coordinate count/values do not match the requested sample"
                    )
                expected_step = float(np.median(np.diff(expected)))
                actual_delta = np.diff(actual)
                actual_step = float(np.median(actual_delta))
                step_tolerance = max(1e-4, abs(expected_step) * 2e-3)
                if (not np.all(np.isfinite(actual_delta)) or np.any(actual_delta == 0)
                        or not (np.all(actual_delta > 0) or np.all(actual_delta < 0))
                        or abs(actual_step - expected_step) > step_tolerance
                        or float(np.max(np.abs(actual_delta - actual_step))) > step_tolerance):
                    raise RuntimeError(
                        f"Returned {axis_name} grid is materially irregular "
                        f"(requested step {expected_step:.10g}, returned {actual_step:.10g})"
                    )
                difference = actual - expected
                if axis_name.lower() in {"longitude", "lon"}:
                    difference = (difference + 180.0) % 360.0 - 180.0
                max_offset = float(np.max(np.abs(difference)))
                if max_offset > 1e-4:
                    index = int(np.argmax(np.abs(difference)))
                    raise RuntimeError(
                        f"Returned {axis_name} coordinates differ from the requested source grid "
                        f"by {max_offset:.8g} degrees at index {index}"
                    )
                return actual

            actual_lat = validate_axis(requested_lat, ds["latitude"].values, "latitude")
            actual_lon = validate_axis(requested_lon, ds["longitude"].values, "longitude")
            if (actual_lat.size, actual_lon.size) != (1440, 2880):
                raise RuntimeError(
                    f"{spec['dataset_id']} returned {(actual_lat.size, actual_lon.size)}; "
                    "expected the 1440 × 2880 Ocean renderer grid"
                )
        return raw, url, actual_lat, actual_lon
    finally:
        try:
            os.unlink(path)
        except FileNotFoundError:
            pass


_ocean._request_erddap = _request_erddap_with_4km_coordinate_validation


# Apply the relaxed coordinate selector only while decoding one of these two
# additional sources. The six established datasets continue through their
# original selector without any behavioural change.
_original_decode_erddap = _ocean._decode_erddap


def _decode_erddap_with_source_specific_axis_tolerance(spec: dict, timestamp: dt.datetime):
    if spec.get("source_id") not in _ADDITIONAL_ERDDAP_SOURCE_IDS:
        return _original_decode_erddap(spec, timestamp)
    previous_selector = _ocean._axis_selector
    _ocean._axis_selector = _axis_selector_with_4km_roundoff
    try:
        return _original_decode_erddap(spec, timestamp)
    finally:
        _ocean._axis_selector = previous_selector


_ocean._decode_erddap = _decode_erddap_with_source_specific_axis_tolerance


def _iso(value: dt.datetime) -> str:
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.astimezone(UTC).isoformat().replace("+00:00", "Z")


def _as_datetime(value) -> dt.datetime:
    if isinstance(value, np.datetime64):
        seconds = value.astype("datetime64[s]").astype(np.int64)
        return dt.datetime.fromtimestamp(int(seconds), UTC)
    if hasattr(value, "year") and hasattr(value, "month"):
        return dt.datetime(
            int(value.year), int(value.month), int(getattr(value, "day", 1)),
            int(getattr(value, "hour", 0)), int(getattr(value, "minute", 0)),
            int(getattr(value, "second", 0)), tzinfo=UTC,
        )
    raise RuntimeError(f"Unsupported NCEI heat-content time coordinate: {value!r}")


def _decode_monthly_time_values(values, units: str, calendar: str = "standard"):
    """Decode NCEI's calendar-month offsets, including mid-month (x.5) stamps.

    The NCEI monthly heat-content file encodes its monthly samples at half-month
    offsets (for example, 0.5, 1.5, ...). Treat the fractional component as a
    fraction of the actual calendar month length, not as a fixed 15-day offset.
    Integer offsets remain supported for older/source variants.
    """
    import calendar as calendar_module
    import re

    raw = np.asarray(values).reshape(-1)
    units_text = str(units or "").strip()
    match = re.fullmatch(
        r"months\s+since\s+(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2})(?:\.([0-9]+))?)?(?:\s*(Z|UTC))?",
        units_text,
        flags=re.IGNORECASE,
    )
    if match:
        year, month, day = (int(match.group(i)) for i in (1, 2, 3))
        hour, minute, second = (int(match.group(i) or 0) for i in (4, 5, 6))
        fraction = match.group(7)
        microsecond = int((fraction or "0").ljust(6, "0")[:6])
        origin = dt.datetime(year, month, day, hour, minute, second, microsecond, tzinfo=UTC)
        calendar_name = str(calendar or "standard").lower()
        if calendar_name not in {"standard", "gregorian", "proleptic_gregorian"}:
            raise RuntimeError(
                f"Unsupported NCEI monthly time calendar for calendar-month offsets: {calendar_name!r}"
            )
        decoded = []
        for value in raw:
            offset = float(value)
            if not np.isfinite(offset):
                raise RuntimeError(f"NCEI monthly time coordinate is not finite: {value!r}")

            # NCEI's monthly product uses half-month centers. Accept only
            # integer or half-integer offsets; do not silently round arbitrary
            # fractional coordinates into a different observation date.
            month_offset = int(np.floor(offset))
            fraction = offset - month_offset
            if min(abs(fraction), abs(fraction - 0.5), abs(fraction - 1.0)) > 1e-6:
                raise RuntimeError(
                    f"NCEI monthly time coordinate has an unsupported fractional month offset: {value!r}"
                )
            if abs(fraction - 1.0) <= 1e-6:
                month_offset += 1
                fraction = 0.0

            absolute_month = origin.year * 12 + (origin.month - 1) + month_offset
            out_year, zero_month = divmod(absolute_month, 12)
            out_month = zero_month + 1
            out_day = min(origin.day, calendar_module.monthrange(out_year, out_month)[1])
            month_start = origin.replace(year=out_year, month=out_month, day=out_day)
            if fraction:
                next_absolute_month = absolute_month + 1
                next_year, next_zero_month = divmod(next_absolute_month, 12)
                next_month = next_zero_month + 1
                next_day = min(origin.day, calendar_module.monthrange(next_year, next_month)[1])
                next_month_start = origin.replace(
                    year=next_year, month=next_month, day=next_day
                )
                month_start += (next_month_start - month_start) * fraction
            decoded.append(month_start)
        return decoded

    calendar_name = str(calendar or "standard")
    try:
        decoded = xr.coding.times.decode_cf_datetime(
            raw, units_text, calendar=calendar_name, use_cftime=None
        )
    except Exception as exc:
        raise RuntimeError(
            f"Unable to decode NCEI heat-content time axis units {units_text!r} "
            f"with calendar {calendar_name!r}: {exc}"
        ) from exc
    return [_as_datetime(value) for value in np.asarray(decoded).reshape(-1)]


def _decode_heat_file(path: str | Path, spec: dict):
    """Decode one native NCEI monthly 0–2000 m heat-content field."""
    # NCEI publishes its monthly coordinate as `months since ...`. That unit
    # is rejected by xarray's default CF decoder for a standard calendar, so
    # read raw coordinates and convert integer calendar-month offsets below.
    with xr.open_dataset(
        path, engine="netcdf4", decode_times=False, mask_and_scale=True
    ) as ds:
        lat_name = next((name for name in ("lat", "latitude") if name in ds.variables), None)
        lon_name = next((name for name in ("lon", "longitude") if name in ds.variables), None)
        if not lat_name or not lon_name or "time" not in ds.variables:
            raise RuntimeError("NCEI heat-content NetCDF is missing time/latitude/longitude coordinates")

        variable_name = "h18_hc" if "h18_hc" in ds.data_vars else None
        if variable_name is None:
            for name, candidate in ds.data_vars.items():
                long_name = str(candidate.attrs.get("long_name", "")).lower()
                units = str(candidate.attrs.get("units", "")).lower()
                if "heat content anomaly" in long_name and ("10^18" in units or "10**18" in units):
                    variable_name = name
                    break
        if variable_name is None:
            raise RuntimeError("NCEI heat-content NetCDF has no identified 10^18-joule heat-content anomaly field")

        field = ds[variable_name]
        source_units = str(field.attrs.get("units", "")).lower()
        if not any(token in source_units for token in ("10^18", "10**18", "1e18")):
            raise RuntimeError(
                f"NCEI heat-content field units are not the documented 10^18 joules: {source_units!r}"
            )
        if "time" not in field.dims:
            raise RuntimeError("NCEI heat-content field has no monthly time dimension")
        time_values = np.asarray(ds["time"].values).reshape(-1)
        if not time_values.size:
            raise RuntimeError("NCEI heat-content source has no published monthly time values")
        time_attrs = ds["time"].attrs
        converted_times = _decode_monthly_time_values(
            time_values,
            str(time_attrs.get("units", "")),
            str(time_attrs.get("calendar", "standard")),
        )
        latest_index = max(range(len(converted_times)), key=lambda index: converted_times[index])
        observed = converted_times[latest_index]

        field = field.isel(time=latest_index)
        for dim in list(field.dims):
            if dim not in (lat_name, lon_name):
                field = field.isel({dim: 0})
        if set(field.dims) != {lat_name, lon_name}:
            raise RuntimeError(f"Unexpected NCEI heat-content field dimensions: {field.dims}")
        values = np.asarray(field.transpose(lat_name, lon_name).values, dtype=np.float64)
        lat = np.asarray(ds[lat_name].values, dtype=np.float64).reshape(-1)
        lon = np.asarray(ds[lon_name].values, dtype=np.float64).reshape(-1)

    if values.shape != (180, 360) or lat.size != 180 or lon.size != 360:
        raise RuntimeError(
            f"NCEI heat-content grid returned {values.shape}; expected native 180 × 360 one-degree grid"
        )
    for axis, name in ((lat, "latitude"), (lon, "longitude")):
        delta = np.diff(axis)
        if (not np.all(np.isfinite(axis)) or not np.all(np.isfinite(delta))
                or not (np.all(delta > 0) or np.all(delta < 0))
                or not np.allclose(delta, np.median(delta), rtol=0.0, atol=1e-5)
                or not np.isclose(abs(float(np.median(delta))), 1.0, atol=1e-5)):
            raise RuntimeError(f"NCEI heat-content {name} axis is not a regular native one-degree grid")
    if not (np.isclose(abs(float(lat[0])), 89.5, atol=1e-5)
            and np.isclose(abs(float(lat[-1])), 89.5, atol=1e-5)):
        raise RuntimeError("NCEI heat-content latitude axis does not span the expected global cell centers")
    return values, lat, lon, observed, variable_name


def _head_heat_source():
    response = _ocean.SESSION.head(HEAT_URL, timeout=(15, 30), allow_redirects=True)
    response.raise_for_status()
    modified = response.headers.get("Last-Modified")
    etag = response.headers.get("ETag")
    modified_utc = None
    if modified:
        parsed = parsedate_to_datetime(modified)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=UTC)
        modified_utc = _iso(parsed)
    return modified_utc, etag


def _heat_is_due(dataset: dict) -> bool:
    metadata_path = _ocean.DB_ROOT / "values" / dataset["dataset_id"] / "metadata.json"
    if not metadata_path.is_file():
        return True
    try:
        current = json.loads(metadata_path.read_text(encoding="utf-8"))
        if current.get("source_id") != HEAT_SOURCE_ID or current.get("source_url") != HEAT_URL:
            return True
        try:
            modified, etag = _head_heat_source()
            if modified and current.get("source_last_modified_utc") != modified:
                return True
            if etag and current.get("source_etag") != etag:
                return True
            if modified or etag:
                return False
        except Exception:
            pass
        retrieved = dt.datetime.fromisoformat(
            str(current.get("retrieved_at_utc", "")).replace("Z", "+00:00")
        )
        if retrieved.tzinfo is None:
            retrieved = retrieved.replace(tzinfo=UTC)
        return dt.datetime.now(UTC) - retrieved > dt.timedelta(days=7)
    except (OSError, ValueError, TypeError, json.JSONDecodeError):
        return True


def _collect_heat(dataset: dict) -> dict:
    try:
        modified, etag = _head_heat_source()
    except Exception:
        # The NetCDF GET remains authoritative; some mirrors omit HEAD metadata.
        modified, etag = None, None
    raw = _ocean._get(HEAT_URL, _ocean.MAX_NETCDF_BYTES).content
    if not raw.startswith((b"CDF\x01", b"CDF\x02", b"\x89HDF\r\n\x1a\n")):
        raise RuntimeError("NOAA NCEI did not return a valid NetCDF heat-content file")
    fd, path = tempfile.mkstemp(suffix=".nc")
    try:
        with os.fdopen(fd, "wb") as stream:
            stream.write(raw)
        values, lat, lon, observed, variable_name = _decode_heat_file(
            path, _ocean.DATASETS[dataset["dataset_id"]]
        )
    finally:
        try:
            os.unlink(path)
        except FileNotFoundError:
            pass

    age = dt.datetime.now(UTC) - observed
    if age > dt.timedelta(days=int(_ocean.DATASETS[dataset["dataset_id"]]["max_age_days"])):
        raise RuntimeError(
            f"NCEI monthly heat-content observation is stale ({age.days} days old): {_iso(observed)}"
        )
    extra = {
        "source_last_modified_utc": modified,
        "source_etag": etag,
        "source_variables": [variable_name],
        "source_file": HEAT_URL.rsplit("/", 1)[-1],
        "processing_level": "monthly_global_analyzed_0_2000m_heat_content_anomaly",
        "quality_status": "noaa_ncei_monthly_native_one_degree_grid_validated_no_interpolation",
        "observation_note": "Monthly global 0–2000 m ocean heat-content anomaly from NOAA NCEI. Values are retained on the native 1-degree grid; no interpolation, regridding, or temporal synthesis is performed.",
    }
    return _ocean._result(
        dataset, _ocean.DATASETS[dataset["dataset_id"]], values, lat, lon,
        observed, [HEAT_URL], extra,
    )


def is_due(dataset: dict) -> bool:
    if dataset.get("dataset_id") == "earth.oceans.ocean_heat":
        return _heat_is_due(dataset)
    return _ocean_fixed.is_due(dataset)


def collect(dataset: dict) -> dict:
    if dataset.get("dataset_id") == "earth.oceans.ocean_heat":
        expected = dataset.get("collection", {}).get("source_id")
        if expected != HEAT_SOURCE_ID:
            raise ValueError(f"Registry source id mismatch for ocean heat: {expected!r}")
        return _collect_heat(dataset)
    result = _ocean_fixed.collect(dataset)
    expected_shapes = {
        "earth.oceans.ocean_colour": (1440, 2880),
        "earth.oceans.marine_productivity": (1440, 2880),
        "earth.oceans.sea_ice": (720, 1440),
    }
    expected = expected_shapes.get(dataset.get("dataset_id"))
    metadata = result.get("metadata", {})
    actual = (metadata.get("height"), metadata.get("width"))
    if expected is None or actual != expected:
        raise RuntimeError(
            f"Additional Ocean grid returned {actual}; expected {expected} for "
            f"{dataset.get('dataset_id')}. Refusing to publish an incompatible grid."
        )
    if metadata.get("units") != _ocean.DATASETS[dataset["dataset_id"]]["units"]:
        raise RuntimeError("Additional Ocean source units do not match the registered data contract")
    return result
