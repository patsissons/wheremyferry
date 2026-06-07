import type { CurrentConditionsBeta, DailySchedule, Routes } from 'scrapemyferry';

export type StaticContext = {
  routes: Routes | null;
  conditions: CurrentConditionsBeta | null;
  arrivalConditions: CurrentConditionsBeta | null;
  dailySchedule: DailySchedule | null;
};
