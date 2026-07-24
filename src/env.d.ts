/// <reference types="astro/client" />
/// <reference types="@astrojs/cloudflare" />
/// <reference types="@cloudflare/workers-types" />

declare namespace Cloudflare {
	interface Env {
		DB: D1Database;
		OWNER_PASSWORD?: string;
		OWNER_USERNAME?: string;
		SESSION_SECRET?: string;
		TASK_API_TOKEN?: string;
	}
}
