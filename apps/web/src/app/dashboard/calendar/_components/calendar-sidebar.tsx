"use client";

import Link from "next/link";
import { Plus, Settings, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { useAccounts } from "@/hooks";
import { useI18n } from "@/lib/i18n/use-i18n";
import type { Platform } from "@/lib/platforms/types";
import { cn } from "@/lib/utils";

interface CalendarSidebarProps {
    onCreatePost: () => void;
    className?: string;
}

export function CalendarSidebar({ onCreatePost, className }: CalendarSidebarProps) {
    const { t } = useI18n();
    const { data: accountsData, isLoading } = useAccounts();
    const accounts = (accountsData?.accounts || []) as any[];

    return (
        <div className={cn("flex w-full flex-col gap-4", className)}>
            {/* Primary CTA */}
            <Button size="lg" className="w-full" onClick={onCreatePost}>
                <Plus className="mr-2 h-4 w-4" />
                {t("Create Post")}
            </Button>

            {/* Channels List */}
            <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                <div className="flex items-center justify-between border-b border-border p-4">
                    <h3 className="font-semibold">{t("Channels")}</h3>
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <Link href="/dashboard/accounts">
                            <Settings className="h-4 w-4" />
                            <span className="sr-only">{t("Manage Accounts")}</span>
                        </Link>
                    </Button>
                </div>

                <ScrollArea className="flex-1">
                    <div className="p-2">
                        {isLoading ? (
                            <div className="space-y-2">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="flex items-center gap-3 rounded-lg p-2">
                                        <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                                        <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                                    </div>
                                ))}
                            </div>
                        ) : accounts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center text-sm text-muted-foreground">
                                <p className="mb-2">{t("No accounts connected")}</p>
                                <Button variant="outline" size="sm" asChild>
                                    <Link href="/dashboard/accounts">
                                        {t("Connect Account")}
                                    </Link>
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {accounts.map((account) => (
                                    <div
                                        key={account._id}
                                        className="flex items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-sm transition-colors hover:bg-muted/50"
                                    >
                                        <div className="relative">
                                            <Avatar className="h-8 w-8 border border-border">
                                                <AvatarImage src={account.profilePictureUrl} />
                                                <AvatarFallback>
                                                    {account.name?.substring(0, 2).toUpperCase() ?? "??"}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="absolute -bottom-1 -right-1 rounded-full bg-background p-0.5">
                                                <PlatformIcon
                                                    platform={account.platform as Platform}
                                                    size="xs"
                                                    showColor
                                                />
                                            </div>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-medium">{account.name}</p>
                                            <p className="truncate text-xs text-muted-foreground capitalize">
                                                {account.platform}
                                            </p>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" asChild>
                                            <a href={account.platformProfileUrl} target="_blank" rel="noopener noreferrer">
                                                <ExternalLink className="h-3 w-3" />
                                            </a>
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <div className="border-t border-border p-3">
                    <Button variant="outline" size="sm" className="w-full" asChild>
                        <Link href="/dashboard/accounts">
                            <Plus className="mr-2 h-3 w-3" />
                            {t("Add Channel")}
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
