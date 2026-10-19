/**
 * Build-time Europe map: SVG paths from Natural Earth (world-atlas 50m), projected in
 * ETRS89-LAEA (EPSG:3035, the EU's statistical projection). No tiles, no runtime requests.
 */
import { geoAzimuthalEqualArea, geoContains, geoGraticule, geoPath } from 'd3-geo';
import { feature, mesh } from 'topojson-client';
import type { GeometryCollection, MultiPolygon, Polygon, Topology } from 'topojson-specification';
import worldJson from 'world-atlas/countries-50m.json' with { type: 'json' };

const RUSSIA = '643';
const UKRAINE = '804';
const SIMFEROPOL: [number, number] = [34.1, 44.95];

/**
 * Natural Earth's default dataset assigns Crimea to Russia. Move that polygon back to
 * Ukraine so the map shows Ukraine's internationally recognised borders (UN GA Res. 68/262).
 */
export function recognisedTopology(): Topology {
  const topo = structuredClone(worldJson) as unknown as Topology;
  const countries = topo.objects.countries as GeometryCollection;
  const ru = countries.geometries.find((g) => g.id === RUSSIA) as MultiPolygon | undefined;
  const ua = countries.geometries.find((g) => g.id === UKRAINE) as
    MultiPolygon | Polygon | undefined;
  if (!ru || !ua) return topo;

  const index = ru.arcs.findIndex((arcs) =>
    geoContains(feature(topo, { type: 'Polygon', arcs }) as never, SIMFEROPOL),
  );
  if (index < 0) return topo;

  const [crimea] = ru.arcs.splice(index, 1);
  if (!crimea) return topo;
  if (ua.type === 'Polygon') {
    const multi = ua as unknown as MultiPolygon;
    multi.type = 'MultiPolygon';
    multi.arcs = [ua.arcs, crimea];
  } else {
    ua.arcs.push(crimea);
  }
  return topo;
}

export interface MapPin {
  name: string;
  lon: number;
  lat: number;
  home?: boolean;
}

export interface EuropeMap {
  width: number;
  height: number;
  land: string;
  borders: string;
  ukraine: string;
  graticule: string;
  pins: Array<MapPin & { x: number; y: number }>;
}

/** Lon/lat window shown on the map (Lisbon to eastern Ukraine, Crete to southern Scandinavia). */
const WINDOW: [number, number][] = [
  [-10, 34],
  [16, 33],
  [42, 34],
  [42, 64],
  [16, 66],
  [-10, 64],
];

export function buildEuropeMap(pins: MapPin[], width = 960, height = 760): EuropeMap {
  const topo = recognisedTopology();
  const countries = topo.objects.countries as GeometryCollection;
  const projection = geoAzimuthalEqualArea()
    .rotate([-10, -52])
    .fitExtent(
      [
        [0, 0],
        [width, height],
      ],
      { type: 'MultiPoint', coordinates: WINDOW },
    )
    .clipExtent([
      [0, 0],
      [width, height],
    ]);
  const path = geoPath(projection).digits(1);
  const ukraine = countries.geometries.find((g) => g.id === UKRAINE);

  return {
    width,
    height,
    land: path(feature(topo, topo.objects.land as GeometryCollection)) ?? '',
    borders: path(mesh(topo, countries, (a, b) => a !== b)) ?? '',
    ukraine: ukraine ? (path(feature(topo, ukraine)) ?? '') : '',
    graticule: path(geoGraticule().step([10, 10])()) ?? '',
    pins: pins.flatMap((pin) => {
      const xy = projection([pin.lon, pin.lat]);
      return xy ? [{ ...pin, x: Math.round(xy[0] * 10) / 10, y: Math.round(xy[1] * 10) / 10 }] : [];
    }),
  };
}
