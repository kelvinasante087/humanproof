/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as airdrop from "../airdrop.js";
import type * as authorization from "../authorization.js";
import type * as credentials from "../credentials.js";
import type * as functions from "../functions.js";
import type * as http from "../http.js";
import type * as onboarding from "../onboarding.js";
import type * as reviews from "../reviews.js";
import type * as seals from "../seals.js";
import type * as selfChallenges from "../selfChallenges.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  airdrop: typeof airdrop;
  authorization: typeof authorization;
  credentials: typeof credentials;
  functions: typeof functions;
  http: typeof http;
  onboarding: typeof onboarding;
  reviews: typeof reviews;
  seals: typeof seals;
  selfChallenges: typeof selfChallenges;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
