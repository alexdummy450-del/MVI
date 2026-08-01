import { createServerClient } from "@supabase/ssr";
import type { Database } from "./src/types/database";

const sb = createServerClient<Database>('url', 'key', { cookies: {} as any });
sb.from('profiles').select('id');
