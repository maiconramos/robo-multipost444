import {
  QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

export const workspaceKeys = {
  all: ["workspaces"] as const,
};

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  role: string;
  createdAt: string;
}

interface WorkspacesResponse {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  multiWorkspaceEnabled: boolean;
}

interface CreateWorkspaceResponse {
  workspace: Workspace;
}

interface UpdateWorkspaceResponse {
  workspace: Workspace;
}

async function fetchApi<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.error || "Request failed");
  }

  return payload as T;
}

function resetWorkspaceScopedQueries(queryClient: QueryClient) {
  queryClient.removeQueries({ queryKey: ["profiles"] });
  queryClient.removeQueries({ queryKey: ["accounts"] });
  queryClient.removeQueries({ queryKey: ["posts"] });
  queryClient.removeQueries({ queryKey: ["queue"] });
  queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
}

export function useWorkspaces() {
  return useQuery({
    queryKey: workspaceKeys.all,
    queryFn: async () => {
      return fetchApi<WorkspacesResponse>("/api/workspaces");
    },
  });
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      return fetchApi<CreateWorkspaceResponse>("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
    },
    onSuccess: () => {
      resetWorkspaceScopedQueries(queryClient);
    },
  });
}

export function useSetActiveWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workspaceId: string) => {
      return fetchApi<{ success: boolean; workspaceId: string }>(
        "/api/workspaces/active",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspaceId }),
        }
      );
    },
    onSuccess: () => {
      resetWorkspaceScopedQueries(queryClient);
    },
  });
}

export function useUpdateWorkspaceName() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workspaceId,
      name,
    }: {
      workspaceId: string;
      name: string;
    }) => {
      return fetchApi<UpdateWorkspaceResponse>(`/api/workspaces/${workspaceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
    },
  });
}
