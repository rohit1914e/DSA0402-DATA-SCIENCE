/**
 * Generate a deterministic prediction explanation from actual environmental values.
 * No AI chatbot - purely rule-based from numeric data.
 */
export function generatePredictionExplanation(
  predicted_aqi: number,
  env: {
    pm25?: number | null; pm10?: number | null; co?: number | null;
    no2?: number | null; so2?: number | null; o3?: number | null;
    temperature?: number | null; humidity?: number | null; wind_speed?: number | null;
  },
  featureImportance?: { feature: string; importance: number }[]
): string {
  const parts: string[] = [];

  // Identify high pollutants
  const highPollutants: string[] = [];
  if (env.pm25 && env.pm25 > 35) highPollutants.push(`PM2.5 (${env.pm25} μg/m³)`);
  if (env.pm10 && env.pm10 > 50) highPollutants.push(`PM10 (${env.pm10} μg/m³)`);
  if (env.no2 && env.no2 > 40) highPollutants.push(`NO₂ (${env.no2} μg/m³)`);
  if (env.o3 && env.o3 > 100) highPollutants.push(`O₃ (${env.o3} μg/m³)`);
  if (env.co && env.co > 500) highPollutants.push(`CO (${env.co} μg/m³)`);
  if (env.so2 && env.so2 > 20) highPollutants.push(`SO₂ (${env.so2} μg/m³)`);

  if (highPollutants.length > 0) {
    parts.push(`Elevated pollutant levels detected: ${highPollutants.join(', ')}.`);
  }

  // Weather factors
  if (env.wind_speed !== null && env.wind_speed !== undefined) {
    if (env.wind_speed < 5) {
      parts.push('Low wind speed may reduce pollutant dispersion.');
    } else if (env.wind_speed > 20) {
      parts.push('High wind speed helps disperse pollutants.');
    }
  }

  if (env.humidity !== null && env.humidity !== undefined) {
    if (env.humidity > 80) {
      parts.push('High humidity can trap particulates near the surface.');
    } else if (env.humidity < 30) {
      parts.push('Low humidity may increase dust and particulate suspension.');
    }
  }

  if (env.temperature !== null && env.temperature !== undefined) {
    if (env.temperature > 35) {
      parts.push('High temperature may enhance photochemical ozone formation.');
    }
  }

  // Top features from model
  if (featureImportance && featureImportance.length > 0) {
    const top3 = featureImportance.slice(0, 3).map(f => f.feature.toUpperCase()).join(', ');
    parts.push(`The model weights ${top3} most heavily in this prediction.`);
  }

  // AQI level summary
  if (predicted_aqi <= 50) {
    parts.push('Overall air quality is predicted to be Good.');
  } else if (predicted_aqi <= 100) {
    parts.push('Overall air quality is predicted to be Moderate.');
  } else if (predicted_aqi <= 150) {
    parts.push('Air quality may be unhealthy for sensitive individuals.');
  } else {
    parts.push('Air quality is predicted to be at unhealthy levels.');
  }

  return parts.join(' ');
}

/**
 * Calculate Pearson correlation between two arrays.
 */
export function pearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 3) return 0;

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumXY += x[i] * y[i];
    sumX2 += x[i] * x[i];
    sumY2 += y[i] * y[i];
  }

  const denom = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

/**
 * Build a correlation matrix for environmental variables.
 */
export function buildCorrelationMatrix(
  data: any[],
  variables: string[]
): { matrix: number[][]; labels: string[] } {
  const filtered = data.filter(d =>
    variables.every(v => d[v] !== null && d[v] !== undefined && !isNaN(d[v]))
  );

  const values: Record<string, number[]> = {};
  variables.forEach(v => {
    values[v] = filtered.map(d => Number(d[v]));
  });

  const matrix: number[][] = [];
  for (let i = 0; i < variables.length; i++) {
    const row: number[] = [];
    for (let j = 0; j < variables.length; j++) {
      if (i === j) row.push(1);
      else row.push(parseFloat(pearsonCorrelation(values[variables[i]], values[variables[j]]).toFixed(2)));
    }
    matrix.push(row);
  }

  return { matrix, labels: variables };
}

export function formatVariableName(name: string): string {
  const map: Record<string, string> = {
    pm25: 'PM2.5', pm10: 'PM10', co: 'CO', no2: 'NO₂', so2: 'SO₂', o3: 'O₃',
    temperature: 'Temp', humidity: 'Humidity', wind_speed: 'Wind',
    pressure: 'Pressure', precipitation: 'Precip', cloud_cover: 'Cloud',
    aqi: 'AQI', hour: 'Hour', day: 'Day', month: 'Month',
  };
  return map[name] || name;
}

export function getVariableUnit(name: string): string {
  const units: Record<string, string> = {
    pm25: 'μg/m³', pm10: 'μg/m³', co: 'μg/m³', no2: 'μg/m³', so2: 'μg/m³', o3: 'μg/m³',
    temperature: '°C', humidity: '%', wind_speed: 'km/h',
    pressure: 'hPa', precipitation: 'mm', cloud_cover: '%', aqi: '',
  };
  return units[name] || '';
}
