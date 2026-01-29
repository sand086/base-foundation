import logo_white_3t from "./logo-white.svg";
import logo_black_3t from "./logo-black.svg";
import favicon_3t from "./favicon.svg";

export const logos_3t = {
  logo_white_3t,
  logo_black_3t,
  favicon_3t,
} as const;

export type LogosKey = keyof typeof logos_3t;
