


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."asset_type" AS ENUM (
    'server',
    'workstation',
    'network_device',
    'web_application',
    'database',
    'mobile_device'
);


ALTER TYPE "public"."asset_type" OWNER TO "postgres";


CREATE TYPE "public"."scan_status" AS ENUM (
    'scheduled',
    'running',
    'completed',
    'failed',
    'cancelled'
);


ALTER TYPE "public"."scan_status" OWNER TO "postgres";


CREATE TYPE "public"."severity_level" AS ENUM (
    'Critical',
    'High',
    'Medium',
    'Low',
    'Info'
);


ALTER TYPE "public"."severity_level" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'admin',
    'analyst',
    'viewer',
    'client'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE TYPE "public"."vulnerability_status" AS ENUM (
    'open',
    'confirmed',
    'false_positive',
    'remediated',
    'accepted'
);


ALTER TYPE "public"."vulnerability_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  new_workspace_id UUID;
BEGIN
  -- Insert the user profile
  INSERT INTO public.user_profiles (id, email, full_name, role, organization)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'analyst'::public.user_role),
    NEW.raw_user_meta_data->>'organization'
  );

  -- *** NEW: Insert a default workspace for the new user ***
  INSERT INTO public.workspaces (name, description, owner_id, client_name)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)) || '''s Workspace', -- e.g., "John Doe's Workspace"
    'Default personal workspace',
    NEW.id, -- Set the new user as the owner
    COALESCE(NEW.raw_user_meta_data->>'organization', 'Personal') -- Use organization or 'Personal'
  ) RETURNING id INTO new_workspace_id; -- Get the ID of the new workspace

  -- *** NEW: Add user to their own workspace in workspace_users ***
  -- This ensures even owner has explicit membership, simplifying some RLS checks later if needed
  -- And allows setting specific permissions like can_scan
  INSERT INTO public.workspace_users (workspace_id, user_id, role, can_scan, can_export)
  VALUES (
      new_workspace_id,
      NEW.id,
      'admin', -- Role within the workspace, 'admin' seems appropriate for owner
      true,    -- Owner can scan
      true     -- Owner can export
  );


  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."assets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid",
    "hostname" "text",
    "ip_address" "inet" NOT NULL,
    "asset_type" "public"."asset_type" DEFAULT 'server'::"public"."asset_type",
    "operating_system" "text",
    "os_version" "text",
    "mac_address" "macaddr",
    "open_ports" integer[],
    "risk_score" numeric(3,1) DEFAULT 0.0,
    "is_active" boolean DEFAULT true,
    "last_scan_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."assets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "scan_type" "text" DEFAULT 'vulnerability_scan'::"text",
    "status" "public"."scan_status" DEFAULT 'scheduled'::"public"."scan_status",
    "target_count" integer DEFAULT 0,
    "progress" integer DEFAULT 0,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "duration_minutes" integer,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."scans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text" NOT NULL,
    "role" "public"."user_role" DEFAULT 'analyst'::"public"."user_role",
    "organization" "text",
    "avatar_url" "text",
    "is_active" boolean DEFAULT true,
    "last_login_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vulnerabilities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid",
    "asset_id" "uuid",
    "scan_id" "uuid",
    "cve_id" "text",
    "title" "text" NOT NULL,
    "description" "text",
    "severity" "public"."severity_level" DEFAULT 'Medium'::"public"."severity_level",
    "cvss_score" numeric(3,1),
    "cvss_vector" "text",
    "status" "public"."vulnerability_status" DEFAULT 'open'::"public"."vulnerability_status",
    "port" integer,
    "service" "text",
    "proof_of_concept" "text",
    "remediation_steps" "text",
    "references" "text"[],
    "discovered_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."vulnerabilities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workspace_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid",
    "user_id" "uuid",
    "role" "text" DEFAULT 'viewer'::"text",
    "can_scan" boolean DEFAULT false,
    "can_export" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."workspace_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workspaces" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "owner_id" "uuid",
    "client_name" "text",
    "client_contact_email" "text",
    "client_contact_phone" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."workspaces" OWNER TO "postgres";


ALTER TABLE ONLY "public"."assets"
    ADD CONSTRAINT "assets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scans"
    ADD CONSTRAINT "scans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vulnerabilities"
    ADD CONSTRAINT "vulnerabilities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workspace_users"
    ADD CONSTRAINT "workspace_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workspace_users"
    ADD CONSTRAINT "workspace_users_workspace_id_user_id_key" UNIQUE ("workspace_id", "user_id");



ALTER TABLE ONLY "public"."workspaces"
    ADD CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_assets_ip" ON "public"."assets" USING "btree" ("ip_address");



CREATE INDEX "idx_assets_risk_score" ON "public"."assets" USING "btree" ("risk_score" DESC);



CREATE INDEX "idx_assets_workspace_id" ON "public"."assets" USING "btree" ("workspace_id");



CREATE INDEX "idx_scans_status" ON "public"."scans" USING "btree" ("status");



CREATE INDEX "idx_scans_workspace_id" ON "public"."scans" USING "btree" ("workspace_id");



CREATE INDEX "idx_user_profiles_email" ON "public"."user_profiles" USING "btree" ("email");



CREATE INDEX "idx_user_profiles_role" ON "public"."user_profiles" USING "btree" ("role");



CREATE INDEX "idx_vulnerabilities_asset_id" ON "public"."vulnerabilities" USING "btree" ("asset_id");



CREATE INDEX "idx_vulnerabilities_severity" ON "public"."vulnerabilities" USING "btree" ("severity");



CREATE INDEX "idx_vulnerabilities_status" ON "public"."vulnerabilities" USING "btree" ("status");



CREATE INDEX "idx_vulnerabilities_workspace_id" ON "public"."vulnerabilities" USING "btree" ("workspace_id");



CREATE INDEX "idx_workspace_users_user_id" ON "public"."workspace_users" USING "btree" ("user_id");



CREATE INDEX "idx_workspace_users_workspace_id" ON "public"."workspace_users" USING "btree" ("workspace_id");



CREATE INDEX "idx_workspaces_active" ON "public"."workspaces" USING "btree" ("is_active");



CREATE INDEX "idx_workspaces_owner_id" ON "public"."workspaces" USING "btree" ("owner_id");



CREATE UNIQUE INDEX "unique_vulnerability_on_asset_level" ON "public"."vulnerabilities" USING "btree" ("asset_id", "title") WHERE ("port" IS NULL);



CREATE UNIQUE INDEX "unique_vulnerability_on_port" ON "public"."vulnerabilities" USING "btree" ("asset_id", "title", "port") WHERE ("port" IS NOT NULL);



CREATE OR REPLACE TRIGGER "update_assets_updated_at" BEFORE UPDATE ON "public"."assets" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_user_profiles_updated_at" BEFORE UPDATE ON "public"."user_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_vulnerabilities_updated_at" BEFORE UPDATE ON "public"."vulnerabilities" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_workspaces_updated_at" BEFORE UPDATE ON "public"."workspaces" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



ALTER TABLE ONLY "public"."assets"
    ADD CONSTRAINT "assets_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scans"
    ADD CONSTRAINT "scans_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user_profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."scans"
    ADD CONSTRAINT "scans_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vulnerabilities"
    ADD CONSTRAINT "vulnerabilities_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vulnerabilities"
    ADD CONSTRAINT "vulnerabilities_scan_id_fkey" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."vulnerabilities"
    ADD CONSTRAINT "vulnerabilities_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workspace_users"
    ADD CONSTRAINT "workspace_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workspace_users"
    ADD CONSTRAINT "workspace_users_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workspaces"
    ADD CONSTRAINT "workspaces_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE "public"."assets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."scans" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_manage_own_user_profiles" ON "public"."user_profiles" TO "authenticated" USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "users_manage_own_workspaces" ON "public"."workspaces" TO "authenticated" USING (("owner_id" = "auth"."uid"())) WITH CHECK (("owner_id" = "auth"."uid"()));



ALTER TABLE "public"."vulnerabilities" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "workspace_members_can_view_workspace" ON "public"."workspaces" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workspace_users" "wu"
  WHERE (("wu"."workspace_id" = "wu"."id") AND ("wu"."user_id" = "auth"."uid"())))));



CREATE POLICY "workspace_members_manage_assets" ON "public"."assets" TO "authenticated" USING (("workspace_id" IN ( SELECT "w"."id"
   FROM "public"."workspaces" "w"
  WHERE (("w"."owner_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."workspace_users" "wu"
          WHERE (("wu"."workspace_id" = "w"."id") AND ("wu"."user_id" = "auth"."uid"())))))))) WITH CHECK (("workspace_id" IN ( SELECT "w"."id"
   FROM "public"."workspaces" "w"
  WHERE (("w"."owner_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."workspace_users" "wu"
          WHERE (("wu"."workspace_id" = "w"."id") AND ("wu"."user_id" = "auth"."uid"()))))))));



CREATE POLICY "workspace_members_manage_scans" ON "public"."scans" TO "authenticated" USING (("workspace_id" IN ( SELECT "w"."id"
   FROM "public"."workspaces" "w"
  WHERE (("w"."owner_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."workspace_users" "wu"
          WHERE (("wu"."workspace_id" = "w"."id") AND ("wu"."user_id" = "auth"."uid"())))))))) WITH CHECK (("workspace_id" IN ( SELECT "w"."id"
   FROM "public"."workspaces" "w"
  WHERE (("w"."owner_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."workspace_users" "wu"
          WHERE (("wu"."workspace_id" = "w"."id") AND ("wu"."user_id" = "auth"."uid"()) AND ("wu"."can_scan" = true))))))));



CREATE POLICY "workspace_members_manage_vulnerabilities" ON "public"."vulnerabilities" TO "authenticated" USING (("workspace_id" IN ( SELECT "w"."id"
   FROM "public"."workspaces" "w"
  WHERE (("w"."owner_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."workspace_users" "wu"
          WHERE (("wu"."workspace_id" = "w"."id") AND ("wu"."user_id" = "auth"."uid"())))))))) WITH CHECK (("workspace_id" IN ( SELECT "w"."id"
   FROM "public"."workspaces" "w"
  WHERE (("w"."owner_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."workspace_users" "wu"
          WHERE (("wu"."workspace_id" = "w"."id") AND ("wu"."user_id" = "auth"."uid"()))))))));



CREATE POLICY "workspace_owners_manage_users" ON "public"."workspace_users" TO "authenticated" USING ((("workspace_id" IN ( SELECT "workspaces"."id"
   FROM "public"."workspaces"
  WHERE ("workspaces"."owner_id" = "auth"."uid"()))) OR ("user_id" = "auth"."uid"()))) WITH CHECK (("workspace_id" IN ( SELECT "workspaces"."id"
   FROM "public"."workspaces"
  WHERE ("workspaces"."owner_id" = "auth"."uid"()))));



ALTER TABLE "public"."workspace_users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workspaces" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "service_role";



GRANT ALL ON TABLE "public"."assets" TO "anon";
GRANT ALL ON TABLE "public"."assets" TO "authenticated";
GRANT ALL ON TABLE "public"."assets" TO "service_role";



GRANT ALL ON TABLE "public"."scans" TO "anon";
GRANT ALL ON TABLE "public"."scans" TO "authenticated";
GRANT ALL ON TABLE "public"."scans" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."vulnerabilities" TO "anon";
GRANT ALL ON TABLE "public"."vulnerabilities" TO "authenticated";
GRANT ALL ON TABLE "public"."vulnerabilities" TO "service_role";



GRANT ALL ON TABLE "public"."workspace_users" TO "anon";
GRANT ALL ON TABLE "public"."workspace_users" TO "authenticated";
GRANT ALL ON TABLE "public"."workspace_users" TO "service_role";



GRANT ALL ON TABLE "public"."workspaces" TO "anon";
GRANT ALL ON TABLE "public"."workspaces" TO "authenticated";
GRANT ALL ON TABLE "public"."workspaces" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







