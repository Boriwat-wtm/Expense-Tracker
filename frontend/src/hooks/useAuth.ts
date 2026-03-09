import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import type { AuthToken, UserOut } from "@/types";

export function useAuth() {
  const navigate = useNavigate();

  const getUser = useCallback((): UserOut | null => {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UserOut;
    } catch {
      return null;
    }
  }, []);

  const isAuthenticated = useCallback(() => {
    return Boolean(localStorage.getItem("access_token"));
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      const { data } = await api.post<AuthToken>("/auth/login", {
        username,
        password,
      });
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));
      navigate("/");
    },
    [navigate]
  );

  const register = useCallback(
    async (username: string, email: string, password: string) => {
      await api.post("/auth/register", { username, email, password });
      await login(username, password);
    },
    [login]
  );

  const logout = useCallback(() => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    navigate("/login");
  }, [navigate]);

  return { getUser, isAuthenticated, login, register, logout };
}
