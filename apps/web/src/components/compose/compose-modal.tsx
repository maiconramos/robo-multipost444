"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ComposeForm } from "@/components/compose/compose-form";
import { useI18n } from "@/lib/i18n/use-i18n";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ComposeModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialDate?: Date;
    onSuccess?: () => void;
}

export function ComposeModal({
    open,
    onOpenChange,
    initialDate,
    onSuccess
}: ComposeModalProps) {
    const { t } = useI18n();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex h-[90vh] min-h-0 max-w-[95vw] flex-col overflow-hidden p-0 sm:max-w-5xl lg:max-w-7xl">
                <DialogHeader className="px-6 py-4 border-b">
                    <DialogTitle>{t("Create Post")}</DialogTitle>
                </DialogHeader>
                <ScrollArea className="min-h-0 flex-1">
                    <div className="p-6">
                        <ComposeForm
                            initialDate={initialDate}
                            onSuccess={() => {
                                onSuccess?.();
                                onOpenChange(false);
                            }}
                        />
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
