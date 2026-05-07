import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserPlus, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface Profile {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  cor?: string | null;
}

interface UserAssignmentPopoverProps {
  profiles: Profile[];
  assignedUserIds: string[];
  onAssignmentChange: (userIds: string[]) => Promise<void>;
  disabled?: boolean;
  compact?: boolean;
}

export default function UserAssignmentPopover({
  profiles,
  assignedUserIds,
  onAssignmentChange,
  disabled = false,
  compact = false,
}: UserAssignmentPopoverProps) {
  const [open, setOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const assignedProfiles = profiles.filter((p) => assignedUserIds.includes(p.user_id));

  const handleToggleUser = async (userId: string) => {
    setIsUpdating(true);
    try {
      const newAssignedIds = assignedUserIds.includes(userId)
        ? assignedUserIds.filter((id) => id !== userId)
        : [...assignedUserIds, userId];
      await onAssignmentChange(newAssignedIds);
    } finally {
      setIsUpdating(false);
    }
  };

  const getInitials = (nome: string) => {
    const parts = nome.split(" ").filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Get profile by user_id
  const getProfileColor = (userId: string) => {
    const profile = profiles.find(p => p.user_id === userId);
    return profile?.cor || '#6B7280';
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-auto p-1 gap-1",
            assignedProfiles.length === 0 && "text-muted-foreground",
            disabled && "pointer-events-none opacity-50"
          )}
          disabled={disabled}
        >
          {assignedProfiles.length === 0 ? (
            <>
              <UserPlus className="h-3.5 w-3.5" />
              {!compact && <span className="text-xs">Atribuir</span>}
            </>
          ) : (
            <div className="flex items-center -space-x-1.5">
              {assignedProfiles.slice(0, 3).map((profile) => (
                <Avatar
                  key={profile.user_id}
                  className="h-5 w-5 border-2 border-background"
                  style={{ backgroundColor: profile.cor || '#6B7280' }}
                >
                  <AvatarFallback className="text-[9px] font-medium text-white bg-transparent">
                    {getInitials(profile.nome)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {assignedProfiles.length > 3 && (
                <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-medium border-2 border-background">
                  +{assignedProfiles.length - 3}
                </div>
              )}
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="flex items-center gap-2 mb-2 px-2 py-1">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Atribuir usuários</span>
        </div>
        <ScrollArea className="max-h-48">
          <div className="space-y-1">
            {profiles.filter((p: any) => !p.deleted_at).map((profile) => {
              const isAssigned = assignedUserIds.includes(profile.user_id);
              return (
                <div
                  key={profile.user_id}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-muted transition-colors",
                    isAssigned && "bg-muted/50"
                  )}
                  onClick={() => !isUpdating && handleToggleUser(profile.user_id)}
                >
                  <Checkbox
                    checked={isAssigned}
                    disabled={isUpdating}
                    className="pointer-events-none"
                  />
                  <Avatar 
                    className="h-6 w-6"
                    style={{ backgroundColor: profile.cor || '#6B7280' }}
                  >
                    <AvatarFallback 
                      className="text-[10px] font-medium text-white bg-transparent"
                      style={{ backgroundColor: profile.cor || '#6B7280' }}
                    >
                      {getInitials(profile.nome)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm truncate flex-1">{profile.nome}</span>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
