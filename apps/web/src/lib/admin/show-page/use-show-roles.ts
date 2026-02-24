import { useRef, useState } from "react";
import type { CastRoleEditDraft, RoleRenameDraft } from "@/lib/admin/show-page/types";

export function useShowRoles<TRole>() {
  const [roleRenameDraft, setRoleRenameDraft] = useState<RoleRenameDraft | null>(null);
  const [roleRenameSaving, setRoleRenameSaving] = useState(false);
  const [castRoleEditDraft, setCastRoleEditDraft] = useState<CastRoleEditDraft | null>(null);
  const [castRoleEditSaving, setCastRoleEditSaving] = useState(false);

  const [showRoles, setShowRoles] = useState<TRole[]>([]);
  const [showRolesLoadedOnce, setShowRolesLoadedOnce] = useState(false);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const [rolesWarning, setRolesWarning] = useState<string | null>(null);
  const [lastSuccessfulRolesAt, setLastSuccessfulRolesAt] = useState<number | null>(null);
  const [newRoleName, setNewRoleName] = useState("");
  const showRolesLoadInFlightRef = useRef<Promise<void> | null>(null);
  const castRoleMembersLoadInFlightRef = useRef<Promise<void> | null>(null);
  const castRoleMembersLoadKeyRef = useRef<string | null>(null);
  const [lastSuccessfulCastRoleMembersAt, setLastSuccessfulCastRoleMembersAt] = useState<number | null>(
    null
  );

  return {
    roleRenameDraft,
    setRoleRenameDraft,
    roleRenameSaving,
    setRoleRenameSaving,
    castRoleEditDraft,
    setCastRoleEditDraft,
    castRoleEditSaving,
    setCastRoleEditSaving,
    showRoles,
    setShowRoles,
    showRolesLoadedOnce,
    setShowRolesLoadedOnce,
    rolesLoading,
    setRolesLoading,
    rolesError,
    setRolesError,
    rolesWarning,
    setRolesWarning,
    lastSuccessfulRolesAt,
    setLastSuccessfulRolesAt,
    newRoleName,
    setNewRoleName,
    showRolesLoadInFlightRef,
    castRoleMembersLoadInFlightRef,
    castRoleMembersLoadKeyRef,
    lastSuccessfulCastRoleMembersAt,
    setLastSuccessfulCastRoleMembersAt,
  };
}
