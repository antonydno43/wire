import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { detectBrowserTimezone } from '../lib/intl';
import type {
  Profile,
  Workspace,
  WorkspaceInvitation,
  WorkspaceMembership,
  WorkspaceRole,
} from '../types/crm';

interface AuthWorkspaceContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  memberships: WorkspaceMembership[];
  activeWorkspace: Workspace | null;
  activeRole: WorkspaceRole | null;
  pendingInvitesForMe: WorkspaceInvitation[];
  loading: boolean;
  configMissing: boolean;
  userTimezone: string;
  switchWorkspace: (workspaceId: string) => void;
  refreshWorkspaceData: () => Promise<void>;
  createWorkspace: (params: {
    name: string;
    currency: string;
    timezone: string;
    countryCode: string;
    gstOrTaxId?: string;
  }) => Promise<{ workspace: Workspace | null; error: string | null }>;
  acceptInviteByToken: (token: string) => Promise<{ workspaceId: string | null; error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthWorkspaceContext = createContext<AuthWorkspaceContextValue | undefined>(undefined);
const ACTIVE_WS_KEY = 'yourbiz_active_workspace_id';

export function AuthWorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [memberships, setMemberships] = useState<WorkspaceMembership[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(() =>
    typeof window !== 'undefined' ? localStorage.getItem(ACTIVE_WS_KEY) : null
  );
  const [pendingInvitesForMe, setPendingInvitesForMe] = useState<WorkspaceInvitation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadUserWorkspaceData = useCallback(async (currentUser: User | null) => {
    if (!supabase || !currentUser) {
      setProfile(null);
      setMemberships([]);
      setPendingInvitesForMe([]);
      setLoading(false);
      return;
    }

    try {
      const [profileRes, memberRes, invitesRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', currentUser.id).maybeSingle(),
        supabase
          .from('workspace_members')
          .select('id, workspace_id, user_id, role, joined_at, workspace:workspaces(*)')
          .eq('user_id', currentUser.id)
          .order('joined_at', { ascending: true }),
        currentUser.email
          ? supabase
              .from('workspace_invitations')
              .select('*, workspace:workspaces(id, name, default_timezone, default_currency)')
              .ilike('email', currentUser.email)
              .eq('status', 'pending')
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (profileRes.data) {
        setProfile(profileRes.data as Profile);
      }

      const rawMemberships = (memberRes.data || []) as unknown as WorkspaceMembership[];
      const validMemberships = rawMemberships.filter((m) => Boolean(m.workspace));
      setMemberships(validMemberships);

      if (invitesRes.data) {
        setPendingInvitesForMe(invitesRes.data as unknown as WorkspaceInvitation[]);
      }

      const savedId = localStorage.getItem(ACTIVE_WS_KEY);
      const hasSaved = validMemberships.some((m) => m.workspace_id === savedId);
      if (hasSaved && savedId) {
        setActiveWorkspaceId(savedId);
      } else if (validMemberships.length > 0) {
        const firstId = validMemberships[0].workspace_id;
        setActiveWorkspaceId(firstId);
        localStorage.setItem(ACTIVE_WS_KEY, firstId);
      } else {
        setActiveWorkspaceId(null);
      }
    } catch (err) {
      console.error('Error loading workspace state:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      loadUserWorkspaceData(data.session?.user ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      loadUserWorkspaceData(newSession?.user ?? null);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [loadUserWorkspaceData]);

  const switchWorkspace = useCallback((workspaceId: string) => {
    setActiveWorkspaceId(workspaceId);
    localStorage.setItem(ACTIVE_WS_KEY, workspaceId);
  }, []);

  const refreshWorkspaceData = useCallback(async () => {
    await loadUserWorkspaceData(user);
  }, [loadUserWorkspaceData, user]);

  const createWorkspace = useCallback(
    async (params: {
      name: string;
      currency: string;
      timezone: string;
      countryCode: string;
      gstOrTaxId?: string;
    }): Promise<{ workspace: Workspace | null; error: string | null }> => {
      if (!supabase || !user) {
        return { workspace: null, error: 'Please sign in first.' };
      }

      const { data, error } = await supabase.rpc('create_workspace_with_defaults', {
        ws_name: params.name,
        ws_currency: params.currency,
        ws_timezone: params.timezone,
        ws_country: params.countryCode,
        ws_tax_id: params.gstOrTaxId || null,
      });

      if (error) {
        return { workspace: null, error: error.message };
      }

      const created = data as Workspace;
      await loadUserWorkspaceData(user);
      if (created?.id) {
        switchWorkspace(created.id);
      }
      return { workspace: created, error: null };
    },
    [loadUserWorkspaceData, switchWorkspace, user]
  );

  const acceptInviteByToken = useCallback(
    async (token: string): Promise<{ workspaceId: string | null; error: string | null }> => {
      if (!supabase || !user) {
        return { workspaceId: null, error: 'Authentication required to accept invitation.' };
      }

      const { data, error } = await supabase.rpc('accept_workspace_invitation', {
        invite_token: token,
      });

      if (error) {
        return { workspaceId: null, error: error.message };
      }

      const joinedWorkspaceId = data as string;
      await loadUserWorkspaceData(user);
      if (joinedWorkspaceId) {
        switchWorkspace(joinedWorkspaceId);
      }
      return { workspaceId: joinedWorkspaceId, error: null };
    },
    [loadUserWorkspaceData, switchWorkspace, user]
  );

  const signOut = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem(ACTIVE_WS_KEY);
    setActiveWorkspaceId(null);
    setProfile(null);
    setMemberships([]);
  }, []);

  const activeMembership =
    memberships.find((m) => m.workspace_id === activeWorkspaceId) || memberships[0] || null;
  const activeWorkspace = activeMembership?.workspace || null;
  const activeRole = activeMembership?.role || null;
  const userTimezone = profile?.preferred_timezone || detectBrowserTimezone();

  return (
    <AuthWorkspaceContext.Provider
      value={{
        user,
        session,
        profile,
        memberships,
        activeWorkspace,
        activeRole,
        pendingInvitesForMe,
        loading,
        configMissing: !isSupabaseConfigured,
        userTimezone,
        switchWorkspace,
        refreshWorkspaceData,
        createWorkspace,
        acceptInviteByToken,
        signOut,
      }}
    >
      {children}
    </AuthWorkspaceContext.Provider>
  );
}

export function useAuthWorkspace() {
  const ctx = useContext(AuthWorkspaceContext);
  if (!ctx) throw new Error('useAuthWorkspace must be used within AuthWorkspaceProvider');
  return ctx;
}
