export const NODE_ENV = process.env.NODE_ENV;
export const ENABLE_API_FIXTURES = import.meta.env.ENABLE_API_FIXTURES;

export const enableApiFixtures = Boolean(ENABLE_API_FIXTURES);
export const isDev = NODE_ENV === 'development';
