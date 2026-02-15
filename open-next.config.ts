import { defineCloudflareConfig } from "@opennextjs/cloudflare";

const config = defineCloudflareConfig({}) as any;

if (!config.build) {
    config.build = {};
}
config.build.minify = true;
config.build.splitting = true;

export default config;
