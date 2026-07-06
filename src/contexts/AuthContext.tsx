import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

interface User {
  username: string;
  id: string;
  token: string;
  tenantId?: string;
  applicationId?: string;
  isAdmin?: boolean;
  isTenantAdmin?: boolean;
  isActive?: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (credentials: any) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const storedUser = localStorage.getItem('userData');
      if (storedUser) {
        try {
          const data = JSON.parse(storedUser);
          const tenantId = localStorage.getItem('tenantId') || undefined;
          const applicationId = localStorage.getItem('applicationId') || undefined;
          
          const baseUser: User = {
            username: data.username,
            id: data.id,
            token: data._token,
            tenantId,
            applicationId,
            isAdmin: data.isAdmin,
            isTenantAdmin: data.isTenantAdmin,
            isActive: data.isActive,
          };
          setUser(baseUser);

          // Fetch latest profile from backend to sync real-time permissions (axios request interceptor will inject updated token dynamically)
          const profileRes = await api.get(`/users/${data.id}/profile`);
          const latestIsAdmin = !!profileRes.data.user?.isAdmin;
          const tenantObj = profileRes.data.tenants?.find((t: any) => t.tenantId === tenantId) || profileRes.data.tenants?.[0];
          const latestIsTenantAdmin = !!tenantObj?.isAdmin;
          const latestIsActive = profileRes.data.user?.isActive !== false;

          // Retrieve updated token if it was refreshed during api.get
          const freshDataStr = localStorage.getItem('userData');
          let freshToken = data._token;
          if (freshDataStr) {
            try {
              freshToken = JSON.parse(freshDataStr)._token || freshToken;
            } catch (e) {}
          }

          localStorage.setItem('userData', JSON.stringify({
            ...data,
            _token: freshToken,
            isAdmin: latestIsAdmin,
            isTenantAdmin: latestIsTenantAdmin,
            isActive: latestIsActive
          }));

          setUser({
            ...baseUser,
            token: freshToken,
            isAdmin: latestIsAdmin,
            isTenantAdmin: latestIsTenantAdmin,
            isActive: latestIsActive,
            tenantId: tenantObj?.tenantId || tenantId,
          });
        } catch (err: any) {
          if (err?.response?.status === 401) {
            console.warn("User session is expired or unauthorized. Logging out...");
          } else {
            console.warn("Failed to initialize profile details, using local cache:", err?.message || err);
          }
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (credentials: any) => {
    try {
      const params = new URLSearchParams();
      params.append('username', credentials.username);
      params.append('password', credentials.password);

      const response = await api.post('/auth/token', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      const { access_token } = response.data;
      let userData = response.data.user;

      if (!userData && access_token) {
        try {
          const payloadStr = atob(access_token.split('.')[1]);
          const payload = JSON.parse(payloadStr);
          userData = {
            id: payload.sub || payload.id || payload.user_id || "unknown",
            name: payload.preferred_username || payload.name || credentials.username
          };
        } catch (e) {
          userData = { id: "unknown", name: credentials.username };
        }
      }

      if (!userData || !userData.id) {
        throw new Error("Invalid login response: missing user data");
      }
      
      const authHeaders = { Authorization: `Bearer ${access_token}` };
      
      // Fetch profile to get tenantId and roles
      let profileRes;
      try {
        profileRes = await api.get(`/users/${userData.id}/profile`, {
          headers: authHeaders
        });
      } catch (profileErr: any) {
        console.warn("Profile fetch failed, using fallback:", profileErr);
        profileRes = { data: { tenants: [], user: { isAdmin: false, isActive: true } } };
      }
      const tenantId = profileRes.data.tenants?.[0]?.tenantId;
      const isAdmin = !!profileRes.data.user?.isAdmin;
      const tenantObj = profileRes.data.tenants?.[0];
      const isTenantAdmin = !!tenantObj?.isAdmin;
      const isActive = profileRes.data.user?.isActive !== false;

      const newUser: User = {
        username: userData.name,
        id: userData.id,
        token: access_token,
        isAdmin,
        isTenantAdmin,
        isActive,
      };

      // Store in standard format compatible with original logic
      localStorage.setItem('userData', JSON.stringify({
        username: userData.name,
        id: userData.id,
        _token: access_token,
        _tokenExpirationDate: new Date(Date.now() + 3600000 * 24 * 365).toISOString(), // Persistent
        isAdmin,
        isTenantAdmin,
        isActive
      }));

      // Store raw login credentials for persistent silent automatic relogin
      localStorage.setItem('loginCredentials', JSON.stringify({
        username: credentials.username,
        password: credentials.password
      }));

      if (tenantId) {
        localStorage.setItem('tenantId', tenantId);
        newUser.tenantId = tenantId;

        // Fetch application ID (matching original app name)
        const appsRes = await api.get(`/applications`, { 
          params: { tenantId },
          headers: authHeaders
        });
        const appId = appsRes.data.result?.find((a: any) => a.name === "LED Solar Street Light")?.id 
                    || appsRes.data.result?.[0]?.id;
        
        if (appId) {
          localStorage.setItem('applicationId', appId);
          newUser.applicationId = appId;
        }
      }

      setUser(newUser);
    } catch (error) {
      console.error('Login failed', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('userData');
    localStorage.removeItem('tenantId');
    localStorage.removeItem('applicationId');
    localStorage.removeItem('loginCredentials');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      isAuthenticated: !!user, 
      loading 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
