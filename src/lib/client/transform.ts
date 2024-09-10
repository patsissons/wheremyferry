import { terminals } from '$lib/data/terminals';
import { regions } from '$lib/data/regions';
import type {
  AnySailingData,
  CapacitySailing,
  Data,
  Region,
  Route,
  RouteData,
  Sailing,
  SailingStatus,
  Terminal,
} from './types';

export function groupByRegion(terminals: Terminal[]) {
  return terminals.reduce((map, terminal) => {
    let region = map.get(terminal.region);
    if (!region) {
      region = {
        ...regions[terminal.region],
        title: terminal.region,
        terminals: new Set([terminal.id]),
      };
      map.set(region.title, region);
    } else {
      region.terminals.add(terminal.id);
    }

    return map;
  }, new Map<string, Region>());
}

export function transformRoutes(routesData: RouteData[], timestampData: number): Data {
  const timestamp = new Date(timestampData);
  const data = routesData.reduce(
    (data, routeData) => {
      const route = transformRoute(routeData, timestamp);
      data.routes.set(route.id, route);

      let fromTerminal = data.terminals.get(route.from);
      if (!fromTerminal) {
        fromTerminal = {
          ...loadTerminal(route.from),
          destinations: new Set([route.to]),
        };
        data.terminals.set(fromTerminal.id, fromTerminal);
      } else {
        fromTerminal.destinations.add(route.to);
      }

      let toTerminal = data.terminals.get(route.to);
      if (!toTerminal) {
        toTerminal = {
          ...loadTerminal(route.to),
          destinations: new Set([route.from]),
        };
        data.terminals.set(toTerminal.id, toTerminal);
      } else {
        toTerminal.destinations.add(route.from);
      }

      data.departures.add(fromTerminal.id);
      data.arrivals.add(toTerminal.id);

      return data;
    },
    {
      routes: new Map<string, Route>(),
      terminals: new Map<string, Terminal>(),
      departures: new Set<string>(),
      arrivals: new Set<string>(),
    },
  );

  const departureTerminals = Array.from(data.terminals.values()).filter(({ id }) =>
    data.departures.has(id),
  );
  const arrivalTerminals = Array.from(data.terminals.values()).filter(({ id }) =>
    data.arrivals.has(id),
  );

  return {
    ...data,
    timestamp,
    departureRegions: groupByRegion(departureTerminals),
    arrivalRegions: groupByRegion(arrivalTerminals),
  };

  function loadTerminal(id: string): Omit<Terminal, 'destinations'> {
    const terminal = terminals[id];
    if (!terminal) {
      return {
        id,
        title: id,
        destinationTitle: id,
        region: 'Other',
      };
    }

    return {
      ...terminal,
      id,
    };
  }

  function transformRoute(routeData: RouteData, timestamp: Date): Route {
    return {
      id: routeData.routeCode,
      from: routeData.fromTerminalCode,
      to: routeData.toTerminalCode,
      duration: parseDuration(routeData.sailingDuration),
      sailings: routeData.sailings.reduce(
        (array, sailingData) =>
          array.concat(transformSailing(sailingData, timestamp, array.at(-1))),
        [] as Sailing[],
      ),
    };

    function transformSailing(
      { time, arrivalTime, vesselName, vesselStatus, ...sailingData }: AnySailingData,
      timestamp: Date,
      previousSailing?: Sailing,
    ): Sailing {
      const depart = parseTime(time);
      const arrive = parseTime(arrivalTime);

      if (previousSailing) {
        if (depart instanceof Date && previousSailing.depart instanceof Date) {
          if (depart.getTime() < previousSailing.depart.getTime()) {
            depart.setDate(depart.getDate() + 1);
          }

          if (arrive instanceof Date) {
            if (arrive.getTime() < depart.getTime()) {
              arrive.setDate(arrive.getDate() + 1);
            }
          }
        }
      } else {
        if (depart instanceof Date) {
          if (timestamp.getTime() - depart.getTime() > 86_400_000) {
            depart.setDate(depart.getDate() + 1);
          }

          if (arrive instanceof Date) {
            if (arrive.getTime() < depart.getTime()) {
              arrive.setDate(arrive.getDate() + 1);
            }
          }
        }
      }

      const sailing = {
        depart,
        arrive,
        vessel: vesselName,
        vesselStatus,
      };

      if ('sailingStatus' in sailingData) {
        const { fill, carFill, oversizeFill, sailingStatus } = sailingData;

        return {
          ...sailing,
          fill,
          carFill,
          oversizeFill,
          status: sailingStatus,
        } as CapacitySailing;
      }

      return { ...sailing, status: inferStatus() };

      function inferStatus(): SailingStatus | undefined {
        if (sailing.depart instanceof Date) {
          if (timestamp.getTime() < sailing.depart.getTime()) {
            return 'future';
          }

          if (sailing.arrive instanceof Date) {
            if (timestamp.getTime() > sailing.arrive.getTime()) return 'past';
            if (timestamp.getTime() >= sailing.depart.getTime()) return 'current';
          }
        }
      }

      function parseTime(value: string) {
        value = value.trim();
        // we can't parse these, so exit early
        if (!value || value === 'Variable' || value === '...') return value;

        const match = /^(\d+):(\d+) (am|pm)$/.exec(value);
        if (!match) return warnTime();

        const [hours, minutes, period] = match.slice(1);
        const parsedDate = new Date();
        parsedDate.setHours((parseInt(hours) % 12) + (period === 'pm' ? 12 : 0));
        parsedDate.setMinutes(parseInt(minutes));
        parsedDate.setSeconds(0);

        return parsedDate;

        function warnTime() {
          return warn('time', value);
        }
      }
    }

    function parseDuration(value: string) {
      value = value.trim();
      // if there is no duration just exit early
      if (!value) return 0;

      if (value.includes(':')) {
        const [hours, minutes] = value.split(':').map((part) => part.trim());
        if (!hours || !minutes) {
          return warnDuration();
        }

        return parseInt(hours) * 3600 + parseInt(minutes) * 60;
      }

      const match = /^(\d+)h (\d+)m$/.exec(value);
      if (!match) return warnDuration();

      const [hours, minutes] = match.slice(1).map((part) => parseInt(part));
      return hours * 3600 + minutes * 60;

      function warnDuration() {
        return warn('duration', value, 0);
      }
    }

    function warn<T = string>(type: string, value: string, fallback: T = value as T) {
      console.warn(`Invalid ${type}: ${value}`);
      return fallback;
    }
  }
}
