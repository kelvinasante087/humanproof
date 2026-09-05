/**
 * Typed function builders that don't depend on `convex/_generated/`.
 *
 * The generated folder only appears after `npx convex dev` (which needs an interactive login), so
 * we derive the DataModel from our schema and type `mutationGeneric` against it here. Result: fully
 * typed `ctx.db`, index names, and `v.id(...)` — while the build stays green before provisioning.
 * When the founder runs `npx convex dev`, these functions deploy unchanged.
 */
import { mutationGeneric } from "convex/server";
import type { DataModelFromSchemaDefinition, MutationBuilder } from "convex/server";
import type schema from "./schema";

type DataModel = DataModelFromSchemaDefinition<typeof schema>;

export const mutation = mutationGeneric as MutationBuilder<DataModel, "public">;
