-- Role dedicada do APP (Fase 1.4) — sujeita a RLS.
--
-- Contexto: o usuário `wayline` do Easypanel é SUPERUSER/owner e por isso
-- IGNORA RLS (superuser sempre bypassa; owner bypassa sem FORCE). O app precisa
-- conectar como uma role SEM superuser e SEM BYPASSRLS para que as policies
-- por org_id realmente valham.
--
-- Rode este script UMA VEZ conectado como `wayline` (owner). Migrações e seed
-- continuam rodando como `wayline`; apenas a app usa `wayline_app`.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'wayline_app') THEN
    CREATE ROLE wayline_app LOGIN PASSWORD '__DEFINA_UMA_SENHA__'
      NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
  END IF;
END$$;

GRANT USAGE ON SCHEMA public TO wayline_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO wayline_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO wayline_app;

-- Objetos futuros (novas tabelas via migração) já nascem acessíveis ao app.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO wayline_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO wayline_app;
