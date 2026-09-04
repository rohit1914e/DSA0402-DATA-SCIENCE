"""AQI calculation utilities."""


def calculate_aqi_from_pm25(pm25: float) -> float:
    """Calculate US AQI from PM2.5 concentration (μg/m³)."""
    if pm25 is None:
        return None

    breakpoints = [
        (0.0, 12.0, 0, 50),
        (12.1, 35.4, 51, 100),
        (35.5, 55.4, 101, 150),
        (55.5, 150.4, 151, 200),
        (150.5, 250.4, 201, 300),
        (250.5, 350.4, 301, 400),
        (350.5, 500.4, 401, 500),
    ]

    for bp_lo, bp_hi, i_lo, i_hi in breakpoints:
        if bp_lo <= pm25 <= bp_hi:
            aqi = ((i_hi - i_lo) / (bp_hi - bp_lo)) * (pm25 - bp_lo) + i_lo
            return round(aqi, 1)

    if pm25 > 500.4:
        return 500.0
    return 0.0


def get_aqi_category(aqi: float) -> dict:
    """Get AQI category info from AQI value."""
    if aqi is None:
        return {"category": "Unknown", "color": "#9e9e9e", "level": 0}

    categories = [
        (0, 50, "Good", "#00e400", 1),
        (51, 100, "Moderate", "#ffff00", 2),
        (101, 150, "Unhealthy for Sensitive Groups", "#ff7e00", 3),
        (151, 200, "Unhealthy", "#ff0000", 4),
        (201, 300, "Very Unhealthy", "#8f3f97", 5),
        (301, 500, "Hazardous", "#7e0023", 6),
    ]

    for lo, hi, category, color, level in categories:
        if lo <= aqi <= hi:
            return {"category": category, "color": color, "level": level}

    if aqi > 500:
        return {"category": "Hazardous", "color": "#7e0023", "level": 6}
    return {"category": "Good", "color": "#00e400", "level": 1}


def calculate_composite_aqi(pm25=None, pm10=None, no2=None, so2=None, o3=None, co=None):
    """
    Calculate composite AQI based on multiple pollutants.
    The overall AQI is the maximum of individual sub-indices.
    """
    sub_indices = []

    if pm25 is not None:
        sub_indices.append(calculate_aqi_from_pm25(pm25))

    if pm10 is not None:
        # PM10 breakpoints
        bp = [
            (0, 54, 0, 50), (55, 154, 51, 100), (155, 254, 101, 150),
            (255, 354, 151, 200), (355, 424, 201, 300), (425, 504, 301, 400),
            (505, 604, 401, 500),
        ]
        for bp_lo, bp_hi, i_lo, i_hi in bp:
            if bp_lo <= pm10 <= bp_hi:
                sub_indices.append(round(((i_hi - i_lo) / (bp_hi - bp_lo)) * (pm10 - bp_lo) + i_lo, 1))
                break

    if sub_indices:
        return max(sub_indices)

    return None
