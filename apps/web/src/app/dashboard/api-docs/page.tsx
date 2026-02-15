"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { useI18n } from "@/lib/i18n/use-i18n";

const SwaggerUI = dynamic(() => import("swagger-ui-react"), {
  ssr: false,
  loading: () => (
    <div className="p-8 text-center text-muted-foreground">
      Loading API docs...
    </div>
  ),
});

export default function ApiDocsPage() {
  const { t } = useI18n();

  // Load swagger-ui CSS dynamically to keep it out of the server bundle
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://unpkg.com/swagger-ui-react@5.31.0/swagger-ui.css";
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  return (
    <div className="mx-auto w-full space-y-4">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">
          {t("API Documentation")}
        </h1>
        <p className="text-muted-foreground">
          {t("Interactive reference for the Robo MultiPost Public API v1.")}
        </p>
      </div>

      {/* Exemplos rápidos */}
      <details className="rounded-md border p-4">
        <summary className="cursor-pointer text-sm font-medium">
          {t("Quick Examples (cURL)")}
        </summary>
        <div className="mt-3 space-y-3 text-sm">
          <div>
            <p className="mb-1 font-medium text-muted-foreground">
              {t("List scheduled posts")}
            </p>
            <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
{`curl -X GET "https://your-app.vercel.app/api/public/v1/posts?status=scheduled" \\
  -H "X-API-Key: rmk_your_api_key_here"`}
            </pre>
          </div>
          <div>
            <p className="mb-1 font-medium text-muted-foreground">
              {t("Create a scheduled post")}
            </p>
            <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
{`curl -X POST "https://your-app.vercel.app/api/public/v1/posts" \\
  -H "X-API-Key: rmk_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "content": "Hello from the API!",
    "platforms": [
      { "platform": "instagram", "accountId": "YOUR_ACCOUNT_ID" }
    ],
    "scheduledFor": "2025-03-15T10:00:00Z",
    "timezone": "America/Sao_Paulo"
  }'`}
            </pre>
          </div>
          <div>
            <p className="mb-1 font-medium text-muted-foreground">
              {t("Response headers (rate limit)")}
            </p>
            <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
{`X-RateLimit-Limit: 60
X-RateLimit-Remaining: 58
X-RateLimit-Reset: 1706745600`}
            </pre>
          </div>
        </div>
      </details>

      {/* Swagger UI */}
      <div className="swagger-container rounded-md border overflow-hidden">
        <SwaggerUI
          url="/openapi/v1.json"
          docExpansion="list"
          defaultModelsExpandDepth={2}
          tryItOutEnabled={true}
        />
      </div>
    </div>
  );
}
