import type { StaticTerminalData } from '$lib/data/terminals';
import type { StaticRegionData } from '$lib/data/regions';
import type { StaticVesselData } from '$lib/data/vessels';

export interface SailingData {
  /**
   * @example 7:30 am
   */
  time: string;
  /**
   * @example 8:10 am
   */
  arrivalTime: string;
  /**
   * seems to always be an empty string for noncapacity sailings
   */
  vesselName: string;
  /**
   * seems to always be an empty string
   */
  vesselStatus: string;
}

export interface CapacitySailingData extends SailingData {
  sailingStatus: 'past' | 'current' | 'future';
  /**
   * between 0 and 100 inclusive
   */
  fill: number;
  /**
   * between 0 and 100 inclusive
   */
  carFill: number;
  /**
   * between 0 and 100 inclusive
   */
  oversizeFill: number;
}

// no additional properties for noncapacity sailings
export type NonCapacitySailingData = SailingData;

export type AnySailingData = CapacitySailingData | NonCapacitySailingData;

export interface RouteData {
  /**
   * @example HSBLNG
   */
  routeCode: string;
  /**
   * @example HSB
   */
  fromTerminalCode: string;
  /**
   * @example LNG
   */
  toTerminalCode: string;
  /**
   * can be an empty string for noncapacity routes
   *
   * @example 0h 40m
   * @example 1h 35m
   */
  sailingDuration: string;
  /**
   * will be empty if sailings are not scheduled
   */
  sailings: AnySailingData[];
}

export interface Vessel extends Partial<StaticVesselData> {
  name: string;
  /**
   * seems to always be undefined
   */
  status?: string;
}

export type SailingStatus = 'past' | 'current' | 'future' | 'departing';

export interface Sailing {
  /**
   * scheduled or actual depature
   */
  depart: Date | string;
  /**
   * scheduled or actual arrival, can be undefined when no scheduled arrival
   */
  arrive?: Date | string;
  /**
   * earliest observed depart for this sailing, populated by the history layer
   * when a matching stored row exists. used to derive the departure delay.
   */
  scheduledDepart?: Date;
  /**
   * seems to always undefined for noncapacity sailings
   */
  vessel?: Vessel;
  /**
   * will be undefined if we don't have a Date for depart and arrive
   */
  status?: SailingStatus;
  /**
   * recent prior sailings of the same vessel (most recent first), surfaced by
   * the history layer to give context about whether the inbound trip may
   * propagate delay into this sailing. omitted (rather than empty) when none
   * are found.
   */
  previousSailings?: PreviousSailing[];
}

export interface PreviousSailing {
  routeCode: string;
  /** origin terminal code for the prior sailing */
  from: string;
  /** destination terminal code for the prior sailing */
  to: string;
  /** route's published sailing duration in seconds, used for delay math */
  duration: number;
  depart: Date;
  arrive?: Date;
  scheduledDepart?: Date;
  vessel?: Vessel;
  status?: SailingStatus;
}

export interface CapacitySailing extends Sailing {
  status: SailingStatus;
  /**
   * between 0 and 100 inclusive
   */
  fill: number;
  /**
   * between 0 and 100 inclusive
   */
  carFill: number;
  /**
   * between 0 and 100 inclusive
   */
  oversizeFill: number;
}

export type AnySailing = Sailing | CapacitySailing;

export interface Route {
  /**
   * @example HSBLNG
   */
  id: string;
  /**
   * @example HSB
   */
  from: string;
  /**
   * @example LNG
   */
  to: string;
  /**
   * sailing duration in seconds, can be zero for noncapacity routes.
   */
  duration: number;
  /**
   * will be empty if sailings are not scheduled
   */
  sailings: Sailing[];
}

export interface Region extends StaticRegionData {
  title: string;
  terminals: Set<string>;
}

export interface Terminal extends StaticTerminalData {
  id: string;
  destinations: Set<string>;
  region: string;
}

export interface Data {
  routes: Map<string, Route>;
  terminals: Map<string, Terminal>;
  departures: Set<string>;
  departureRegions: Map<string, Region>;
  arrivals: Set<string>;
  arrivalRegions: Map<string, Region>;
  timestamp: Date;
}
