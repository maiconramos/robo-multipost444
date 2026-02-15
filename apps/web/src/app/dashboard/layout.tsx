"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useSession, signOut } from "@/lib/auth/client";
import { useAppStore } from "@/stores/app-store";
import {
  useCreateWorkspace,
  useProfiles,
  useSetActiveWorkspace,
  useUpdateWorkspaceName,
  useWorkspaces,
} from "@/hooks";
import { useI18n } from "@/lib/i18n/use-i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ErrorBoundary, LanguageSwitcher, Logo } from "@/components/shared";
import { toast } from "sonner";
import {
  LayoutDashboard,
  PenSquare,
  Calendar,
  Users,
  ListOrdered,
  Image as ImageIcon,
  FileCode,
  FileText,
  SwatchBook,
  BookOpen,
  Settings,
  Moon,
  Sun,
  LogOut,
  ChevronDown,
  Check,
  Plus,
  Pencil,
} from "lucide-react";

const mobileNavItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Compose",
    href: "/dashboard/compose",
    icon: PenSquare,
  },
  {
    label: "Calendar",
    href: "/dashboard/calendar",
    icon: Calendar,
  },
  {
    label: "Accounts",
    href: "/dashboard/accounts",
    icon: Users,
  },
  {
    label: "Queue",
    href: "/dashboard/queue",
    icon: ListOrdered,
  },
];

const navItems = [
  ...mobileNavItems,
  {
    label: "Media",
    href: "/dashboard/media",
    icon: ImageIcon,
  },
  {
    label: "API Docs",
    href: "/dashboard/api-docs",
    icon: FileCode,
  },
  {
    label: "Design System",
    href: "/dashboard/design-system",
    icon: SwatchBook,
  },
  {
    label: "Logs",
    href: "/dashboard/logs",
    icon: FileText,
  },
  {
    label: "Tutorial",
    href: "/docs",
    icon: BookOpen,
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [workspaceDialogOpen, setWorkspaceDialogOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [renameWorkspaceDialogOpen, setRenameWorkspaceDialogOpen] = useState(false);
  const [renameWorkspaceName, setRenameWorkspaceName] = useState("");

  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending: sessionLoading } = useSession();
  const { defaultProfileId, setDefaultProfileId } = useAppStore();
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();
  const { data: profilesData } = useProfiles();
  const { data: workspacesData, isLoading: workspacesLoading } = useWorkspaces();
  const createWorkspaceMutation = useCreateWorkspace();
  const setActiveWorkspaceMutation = useSetActiveWorkspace();
  const updateWorkspaceNameMutation = useUpdateWorkspaceName();

  const profiles = profilesData?.profiles || [];
  const currentProfile = profiles.find((p: any) => p._id === defaultProfileId) || profiles[0];
  const workspaces = workspacesData?.workspaces || [];
  const activeWorkspaceId =
    workspacesData?.activeWorkspaceId || workspaces[0]?.id || null;
  const currentWorkspace =
    workspaces.find((workspace) => workspace.id === activeWorkspaceId) || workspaces[0];
  const canCreateWorkspace =
    !!workspacesData?.multiWorkspaceEnabled &&
    workspaces.some((workspace) => workspace.role === "OWNER");
  const canRenameWorkspace = currentWorkspace?.role === "OWNER";

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!sessionLoading && !session) {
      router.push("/login");
    }
  }, [session, sessionLoading, router]);

  const handleLogout = async () => {
    await signOut();
    router.push("/");
  };

  const handleWorkspaceSwitch = async (workspaceId: string) => {
    if (!workspaceId || workspaceId === activeWorkspaceId) {
      return;
    }

    try {
      await setActiveWorkspaceMutation.mutateAsync(workspaceId);
      setDefaultProfileId(null);
      router.refresh();
      toast.success(t("Workspace changed"));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("Failed to switch workspace");
      toast.error(message);
    }
  };

  const handleCreateWorkspace = async () => {
    const name = newWorkspaceName.trim();
    if (!name) {
      toast.error(t("Workspace name is required"));
      return;
    }

    try {
      await createWorkspaceMutation.mutateAsync(name);
      setDefaultProfileId(null);
      setNewWorkspaceName("");
      setWorkspaceDialogOpen(false);
      router.refresh();
      toast.success(t("Workspace created"));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("Failed to create workspace");
      toast.error(message);
    }
  };

  const openRenameWorkspaceDialog = () => {
    if (!currentWorkspace) return;
    setRenameWorkspaceName(currentWorkspace.name);
    setRenameWorkspaceDialogOpen(true);
  };

  const handleRenameWorkspace = async () => {
    const workspaceId = activeWorkspaceId;
    const name = renameWorkspaceName.trim();

    if (!workspaceId) {
      toast.error(t("No workspace selected"));
      return;
    }

    if (!name) {
      toast.error(t("Workspace name is required"));
      return;
    }

    if (currentWorkspace?.name === name) {
      setRenameWorkspaceDialogOpen(false);
      return;
    }

    try {
      await updateWorkspaceNameMutation.mutateAsync({ workspaceId, name });
      setRenameWorkspaceDialogOpen(false);
      router.refresh();
      toast.success(t("Workspace updated"));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("Failed to update workspace");
      toast.error(message);
    }
  };

  // Don't render until session resolved
  if (sessionLoading || !session) {
    return null;
  }

  const userName = session.user.name || session.user.email;
  const userInitial = (userName || "U")[0].toUpperCase();

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar - Desktop only */}
      <aside className="hidden lg:flex w-56 flex-col border-r border-border bg-card">
        <div className="border-b border-border">
          {/* Logo */}
          <div className="flex h-14 items-center px-4">
            <Logo size="sm" />
          </div>

          {/* Workspace selector */}
          <div className="px-3 pb-3">
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 justify-between gap-2"
                    disabled={workspacesLoading || setActiveWorkspaceMutation.isPending}
                  >
                    <span className="truncate">
                      {currentWorkspace?.name || t("Select Workspace")}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuLabel>{t("Switch Workspace")}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {workspaces.map((workspace) => (
                    <DropdownMenuItem
                      key={workspace.id}
                      onClick={() => handleWorkspaceSwitch(workspace.id)}
                      className="gap-2"
                    >
                      <span className="flex-1 truncate">{workspace.name}</span>
                      {workspace.id === activeWorkspaceId && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </DropdownMenuItem>
                  ))}
                  {!workspaces.length && (
                    <DropdownMenuItem disabled>{t("No workspaces found")}</DropdownMenuItem>
                  )}

                  {workspacesData?.multiWorkspaceEnabled && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setWorkspaceDialogOpen(true)}
                        disabled={!canCreateWorkspace}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        {t("Create Workspace")}
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={openRenameWorkspaceDialog}
                disabled={!canRenameWorkspace}
                aria-label={t("Rename Workspace")}
                title={t("Rename Workspace")}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2">
          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span>{t(item.label)}</span>
                </Link>
              );
            })}
          </div>

          <Separator className="my-3" />

          {/* Settings */}
          <Link
            href="/dashboard/settings"
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              pathname === "/dashboard/settings"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Settings className="h-4 w-4 shrink-0" />
            <span>{t("Settings")}</span>
          </Link>
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-14 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-3">
            {/* Logo on mobile (since sidebar is hidden) */}
            <div className="lg:hidden">
              <Logo size="sm" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Profile Selector */}
            {profiles.length > 1 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{
                        backgroundColor:
                          (currentProfile as any)?.color || "var(--profile-fallback)",
                      }}
                    />
                    <span className="max-w-24 truncate">
                      {currentProfile?.name || t("Select Profile")}
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>{t("Switch Profile")}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {profiles.map((profile: any) => (
                    <DropdownMenuItem
                      key={profile._id}
                      onClick={() => setDefaultProfileId(profile._id)}
                      className="gap-2"
                    >
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{
                          backgroundColor:
                            (profile as any).color || "var(--profile-fallback)",
                        }}
                      />
                      <span className="flex-1 truncate">{profile.name}</span>
                      {profile._id === defaultProfileId && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <Separator orientation="vertical" className="h-6" />
            <LanguageSwitcher variant="ghost" size="sm" />

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label={t("Toggle theme")}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                  {session.user.image ? (
                    <img
                      src={session.user.image}
                      alt={t("User avatar")}
                      className="h-7 w-7 rounded-full"
                    />
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                      {userInitial}
                    </div>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-xs truncate">
                  {session.user.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="text-sm">
                  <Link href="/dashboard/settings">
                    <Settings className="mr-2 h-3 w-3" />
                    {t("Settings")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-sm text-destructive">
                  <LogOut className="mr-2 h-3 w-3" />
                  {t("Sign Out")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 pb-20 lg:p-6 lg:pb-6">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>

      {/* Mobile Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card pb-safe lg:hidden">
        <div className="flex h-16 items-center justify-around px-2">
          {mobileNavItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-3 py-2 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{t(item.label)}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <Dialog open={workspaceDialogOpen} onOpenChange={setWorkspaceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Create Workspace")}</DialogTitle>
            <DialogDescription>
              {t("Create a new workspace and switch to it immediately.")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="workspace-name">{t("Workspace Name")}</Label>
            <Input
              id="workspace-name"
              value={newWorkspaceName}
              onChange={(event) => setNewWorkspaceName(event.target.value)}
              placeholder={t("Agency Client A")}
              disabled={createWorkspaceMutation.isPending}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setWorkspaceDialogOpen(false)}
              disabled={createWorkspaceMutation.isPending}
            >
              {t("Cancel")}
            </Button>
            <Button onClick={handleCreateWorkspace} disabled={createWorkspaceMutation.isPending}>
              {createWorkspaceMutation.isPending ? t("Creating...") : t("Create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={renameWorkspaceDialogOpen}
        onOpenChange={setRenameWorkspaceDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Rename Workspace")}</DialogTitle>
            <DialogDescription>
              {t("Update the name of the current workspace.")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="workspace-rename-name">{t("Workspace Name")}</Label>
            <Input
              id="workspace-rename-name"
              value={renameWorkspaceName}
              onChange={(event) => setRenameWorkspaceName(event.target.value)}
              placeholder={t("Agency Client A")}
              disabled={updateWorkspaceNameMutation.isPending}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenameWorkspaceDialogOpen(false)}
              disabled={updateWorkspaceNameMutation.isPending}
            >
              {t("Cancel")}
            </Button>
            <Button
              onClick={handleRenameWorkspace}
              disabled={updateWorkspaceNameMutation.isPending}
            >
              {updateWorkspaceNameMutation.isPending ? t("Saving...") : t("Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
