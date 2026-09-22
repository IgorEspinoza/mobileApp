"use client";

import { useState } from "react";
import type { HomeMember, User } from "@/types/database";

type MemberWithUser = HomeMember & {
  user: Pick<User, "id" | "full_name" | "email" | "avatar_url">;
};

interface MembersManagementProps {
  members: MemberWithUser[];
  currentUserId: string;
  isOwner: boolean;
  onInvite: (email: string) => Promise<void>;
  onRemove: (memberId: string) => Promise<void>;
  isLoading?: boolean;
}

export function MembersManagement({
  members,
  currentUserId,
  isOwner,
  onInvite,
  onRemove,
  isLoading = false,
}: MembersManagementProps) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);

    if (!inviteEmail.trim()) {
      setInviteError("El email es requerido");
      return;
    }

    try {
      await onInvite(inviteEmail.trim());
      setInviteEmail("");
      setShowInvite(false);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Error al invitar");
    }
  };

  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-900/40 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Miembros ({members.length})</h3>
        {isOwner && (
          <button
            type="button"
            onClick={() => setShowInvite(!showInvite)}
            className="min-h-[36px] rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-300 hover:border-slate-400 hover:bg-slate-800 transition-colors"
          >
            {showInvite ? "Cancelar" : "+ Invitar"}
          </button>
        )}
      </div>

      {showInvite && (
        <form onSubmit={handleInvite} className="mb-4 space-y-2">
          {inviteError && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-xs text-red-300">
              {inviteError}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="email@ejemplo.com"
              className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
            <button
              type="submit"
              disabled={isLoading}
              className="min-h-[36px] rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              Invitar
            </button>
          </div>
          <p className="text-xs text-slate-500">El usuario debe estar registrado en MiDinero AI</p>
        </form>
      )}

      <div className="space-y-2">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between rounded-lg border border-slate-700/50 bg-slate-800/50 px-4 py-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-700 text-sm font-medium text-white">
                {member.user.full_name?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {member.user.full_name ?? "Sin nombre"}
                  {member.user_id === currentUserId && (
                    <span className="ml-1.5 text-xs text-slate-500">(tú)</span>
                  )}
                </p>
                <p className="text-xs text-slate-400 truncate">{member.user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  member.role === "owner"
                    ? "bg-amber-500/20 text-amber-300"
                    : "bg-slate-700 text-slate-300"
                }`}
              >
                {member.role === "owner" ? "Admin" : "Miembro"}
              </span>

              {isOwner && member.user_id !== currentUserId && (
                <button
                  type="button"
                  onClick={() => onRemove(member.id)}
                  disabled={isLoading}
                  className="min-h-[32px] rounded-lg px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 disabled:opacity-50 transition-colors"
                >
                  Eliminar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
