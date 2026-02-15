import type { Platform } from "@/lib/platforms/types";
import type {
  ProviderConnectionMethod,
  ProviderType,
} from "@/lib/providers/catalog/types";

export interface ProviderRuntimeEntry {
  identifier: string;
  platform: Platform;
  connectionMethod: ProviderConnectionMethod;
  providerType: ProviderType;
}
