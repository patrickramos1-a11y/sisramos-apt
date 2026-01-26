import React, { createContext, useContext, useEffect, useState } from "react";

type AppRole = "admin" | "gestor" | "colaborador";

interface Profile {
  id: string;
  user_id: string;
  nome: string;
  email: string;
}

// Simplified user object for compatibility
interface SimpleUser {
  id: string;
}

interface AuthContextType {
  user: SimpleUser | null;
  profile: Profile | null;
  role: AppRole | null;
  isLoading: boolean;
  isGestorOrAdmin: boolean;
  selectUser: (userId: string) => Promise<{ error: Error | null }>;
  signOut: () => void;
}

const SELECTED_USER_KEY = "apt_selected_user";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Create a simple user object from profile for compatibility
  const user: SimpleUser | null = profile ? { id: profile.user_id } : null;

  const fetchUserData = async (userId: string) => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (profileError || !profileData) {
        console.error("Error fetching profile:", profileError);
        return false;
      }

      setProfile(profileData);

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .single();

      if (roleData) {
        setRole(roleData.role as AppRole);
      } else {
        setRole("colaborador");
      }

      return true;
    } catch (error) {
      console.error("Error fetching user data:", error);
      return false;
    }
  };

  useEffect(() => {
    // Check for saved user on mount
    const savedUserId = localStorage.getItem(SELECTED_USER_KEY);
    
    if (savedUserId) {
      fetchUserData(savedUserId).then((success) => {
        if (!success) {
          localStorage.removeItem(SELECTED_USER_KEY);
        }
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, []);

  const selectUser = async (userId: string): Promise<{ error: Error | null }> => {
    try {
      const success = await fetchUserData(userId);
      
      if (success) {
        localStorage.setItem(SELECTED_USER_KEY, userId);
        return { error: null };
      } else {
        return { error: new Error("Usuário não encontrado") };
      }
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = () => {
    localStorage.removeItem(SELECTED_USER_KEY);
    setProfile(null);
    setRole(null);
  };

  const isGestorOrAdmin = role === "gestor" || role === "admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        isLoading,
        isGestorOrAdmin,
        selectUser,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
