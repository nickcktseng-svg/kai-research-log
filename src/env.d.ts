/// <reference types="astro/client" />
/// <reference types="@astrojs/cloudflare" />
/// <reference types="@cloudflare/workers-types" />

declare namespace Cloudflare {
	interface Env {
		DB: D1Database;
		TASK_API_TOKEN?: string;
	}
}
