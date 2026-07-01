/**
 * Schema Drizzle do Wayline (Fase 0).
 *
 * Estrutura inicial — sem conexão real com Postgres ainda. Cobre o núcleo
 * multi-tenant e a hierarquia base. RLS por `org_id` será adicionada via
 * migrações numa etapa futura.
 */
export * from "./_shared";
export * from "./core";
export * from "./hierarchy";
