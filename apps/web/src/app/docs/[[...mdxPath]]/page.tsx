export default function DocsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Documentation</h1>
      <p className="text-muted-foreground">
        Documentation is coming soon. Check the API docs at{" "}
        <a href="/dashboard/api-docs" className="text-primary underline">
          /dashboard/api-docs
        </a>
        .
      </p>
    </div>
  );
}
