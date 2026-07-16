import pg from 'pg';
import { config } from './config.js';

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  max: 10,
});

export const query = (text, params) => pool.query(text, params);

/** Helper: convierte un rectángulo {minLng,minLat,maxLng,maxLat} a geography PostGIS */
export function rectToGeography({ minLng, minLat, maxLng, maxLat }) {
  return `ST_GeogFromText('POLYGON((${minLng} ${minLat}, ${maxLng} ${minLat}, ${maxLng} ${maxLat}, ${minLng} ${maxLat}, ${minLng} ${minLat}))')`;
}
