"use client";

import { useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { ImageIcon } from "lucide-react";
import type { UploadedMedia } from "@/hooks";
import type { Platform } from "@/lib/platforms/types";
import { useI18n } from "@/lib/i18n/use-i18n";

interface PostPreviewProps {
    content: string;
    media: UploadedMedia[];
    platforms: Platform[];
    author?: {
        name: string;
        image?: string;
    };
}

export function PostPreview({
    content,
    media,
    platforms,
    author = { name: "You", image: undefined },
}: PostPreviewProps) {
    const { t } = useI18n();
    const selectedPlatform = platforms[0] || "instagram";

    // If multiple platforms, we could show tabs, but for now let's just show the first selected or a default
    const PreviewCard = useMemo(() => {
        switch (selectedPlatform) {
            case "instagram":
                return InstagramPreview;
            case "twitter":
                return TwitterPreview;
            case "facebook":
                return FacebookPreview;
            case "linkedin":
                return LinkedInPreview;
            default:
                return GenericPreview;
        }
    }, [selectedPlatform]);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">
                    {t("Preview")}
                </h3>
                <div className="flex gap-1">
                    {platforms.map((p, index) => (
                        <Badge
                            key={`${p}-${index}`}
                            variant={selectedPlatform === p ? "default" : "outline"}
                            className="text-[10px] capitalize"
                        >
                            <PlatformIcon platform={p} size="xs" className="mr-1" />
                            {p}
                        </Badge>
                    ))}
                </div>
            </div>

            <div className="mx-auto max-w-[350px] overflow-hidden rounded-xl border bg-background shadow-sm">
                <PreviewCard
                    content={content}
                    media={media}
                    author={author}
                />
            </div>
        </div>
    );
}

interface PreviewProps {
    content: string;
    media: UploadedMedia[];
    author: { name: string; image?: string };
}

function InstagramPreview({ content, media, author }: PreviewProps) {
    const { t } = useI18n();
    const hasMedia = media.length > 0;

    return (
        <div className="flex flex-col bg-white text-black dark:bg-black dark:text-white">
            {/* Header */}
            <div className="flex items-center gap-2 p-3">
                <Avatar className="h-8 w-8">
                    <AvatarImage src={author.image} />
                    <AvatarFallback>{author.name[0]}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-semibold">{author.name}</span>
            </div>

            {/* Media */}
            <div className="aspect-square w-full bg-muted">
                {hasMedia ? (
                    <MediaDisplay media={media[0]} className="h-full w-full object-cover" />
                ) : (
                    <div className="flex h-full items-center justify-center bg-muted/50 text-muted-foreground">
                        <ImageIcon className="h-10 w-10 opacity-20" />
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between p-3">
                <div className="flex gap-4">
                    <HeartIcon className="h-6 w-6" />
                    <MessageCircleIcon className="h-6 w-6" />
                    <SendIcon className="h-6 w-6" />
                </div>
                <BookmarkIcon className="h-6 w-6" />
            </div>

            {/* Content */}
            <div className="px-3 pb-3">
                <p className="text-sm">
                    <span className="font-semibold mr-2">{author.name}</span>
                    {content || <span className="text-muted-foreground italic">{t("Write your caption...")}</span>}
                </p>
            </div>
        </div>
    );
}

function TwitterPreview({ content, media, author }: PreviewProps) {
    const { t } = useI18n();
    return (
        <div className="bg-white p-4 text-black dark:bg-black dark:text-white">
            <div className="flex gap-3">
                <Avatar className="h-10 w-10">
                    <AvatarImage src={author.image} />
                    <AvatarFallback>{author.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-1">
                        <span className="font-bold">{author.name}</span>
                        <span className="text-muted-foreground">@username</span>
                    </div>
                    <p className="text-[15px] whitespace-pre-wrap">
                        {content || <span className="text-muted-foreground italic">{t("What's happening?")}</span>}
                    </p>
                    {media.length > 0 && (
                        <div className="mt-3 overflow-hidden rounded-2xl border border-border">
                            <MediaDisplay media={media[0]} className="max-h-[300px] w-full object-cover" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Generic / Facebook / LinkedIn fallbacks to a simple card
function GenericPreview({ content, media, author }: PreviewProps) {
    const { t } = useI18n();
    return (
        <div className="p-4 bg-card text-card-foreground">
            <div className="flex items-center gap-2 mb-3">
                <Avatar className="h-10 w-10">
                    <AvatarImage src={author.image} />
                    <AvatarFallback>{author.name[0]}</AvatarFallback>
                </Avatar>
                <div>
                    <p className="font-semibold text-sm">{author.name}</p>
                    <p className="text-xs text-muted-foreground">{t("Just now")}</p>
                </div>
            </div>
            <p className="text-sm mb-3 whitespace-pre-wrap">
                {content || <span className="text-muted-foreground italic">{t("Start writing...")}</span>}
            </p>
            {media.length > 0 && (
                <div className="rounded-lg overflow-hidden border border-border">
                    <MediaDisplay media={media[0]} className="w-full h-auto max-h-[300px] object-cover" />
                </div>
            )}
        </div>
    )
}

function FacebookPreview(props: PreviewProps) {
    return <GenericPreview {...props} />
}

function LinkedInPreview(props: PreviewProps) {
    return <GenericPreview {...props} />
}


function MediaDisplay({ media, className }: { media: UploadedMedia; className?: string }) {
    if (media.type === "video") {
        return (
            <video
                src={media.url}
                className={className}
                autoPlay
                muted
                playsInline
                controls
            />
        );
    }
    return <img src={media.url} alt="Post media" className={className} />;
}

// Simple icons to avoid importing big libraries for just preview
function HeartIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        </svg>
    );
}

function MessageCircleIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
        </svg>
    );
}

function SendIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m22 2-7 20-4-9-9-4Z" />
            <path d="M22 2 11 13" />
        </svg>
    );
}

function BookmarkIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
        </svg>
    );
}
