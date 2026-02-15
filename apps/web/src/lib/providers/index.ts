import type { SocialAccount } from "@prisma/client";
import { decrypt } from "@/lib/encryption";
import { prisma } from "@/lib/prisma";
import { resolveProviderTypeFromIdentifier } from "@/lib/providers/runtime/registry";
import { BYOProvider } from "@/lib/providers/byo-provider";
import { LateProvider } from "@/lib/providers/late-provider";
import type { PostingProvider } from "@/lib/providers/types";

export type ProviderType = "late" | "byo";

export async function getProvider(
  workspaceId: string,
  preferredType?: ProviderType,
): Promise<PostingProvider> {
  if (preferredType === "byo") {
    return new BYOProvider(workspaceId);
  }

  if (preferredType === "late") {
    const lateCredential = await prisma.credential.findFirst({
      where: {
        workspaceId,
        type: "late_api_key",
      },
      select: {
        keyEnc: true,
        encryptedValue: true,
      },
    });

    const value = lateCredential?.encryptedValue ?? lateCredential?.keyEnc;
    if (!value) {
      throw new Error("Late provider requested but no late_api_key credential was found");
    }

    return new LateProvider(decrypt(value), workspaceId);
  }

  return new BYOProvider(workspaceId);
}

export async function getProviderForAccount(
  workspaceId: string,
  account: Pick<SocialAccount, "id" | "connectionMethod" | "providerIdentifier">,
): Promise<PostingProvider> {
  const providerType =
    resolveProviderTypeFromIdentifier(account.providerIdentifier) ??
    (account.connectionMethod === "LATE" ? "late" : "byo");

  if (providerType === "late") {
    const lateCredential = await prisma.credential.findFirst({
      where: {
        workspaceId,
        socialAccountId: account.id,
        kind: "LATE_API_KEY",
      },
      select: {
        encryptedValue: true,
      },
    });

    if (!lateCredential?.encryptedValue) {
      throw new Error("Missing LATE_API_KEY credential for selected social account");
    }

    return new LateProvider(decrypt(lateCredential.encryptedValue), workspaceId);
  }

  return new BYOProvider(workspaceId);
}

export async function hasLateProvider(workspaceId: string): Promise<boolean> {
  const lateCredential = await prisma.credential.findFirst({
    where: {
      workspaceId,
      type: "late_api_key",
    },
    select: { id: true },
  });

  return !!lateCredential;
}

export { BYOProvider, LateProvider };
export * from "@/lib/providers/types";
