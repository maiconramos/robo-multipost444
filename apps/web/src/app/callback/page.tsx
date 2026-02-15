import { Suspense } from "react";
import { CallbackClient } from "./_components/callback-client";
import { CallbackLoading } from "./_components/callback-loading";

// Prevent static prerendering - this page requires searchParams
export const dynamic = "force-dynamic";

export default function CallbackPage() {
  return (
    <Suspense fallback={<CallbackLoading />}>
      <CallbackClient />
    </Suspense>
  );
}
