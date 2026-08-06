import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../config";
import type { RoleType } from "../api/users";

const TOKEN_KEY = "admin_token";

interface MeResponse {
  email: string;
  first_name: string | null;
  last_name: string | null;
  is_admin: boolean;
  google_id: string | null;
  has_password: boolean;
  avatar_url: string | null;
  phone_number: string | null;
  roles: RoleType[];
  teaching_subject_ids: number[];
  language_ids: number[];
}

export function storeAdminToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function useAdmin() {
  const [email, setEmail] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [lastName, setLastName] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [roles, setRoles] = useState<RoleType[]>([]);
  const [teachingSubjectIds, setTeachingSubjectIds] = useState<number[]>([]);
  const [languageIds, setLanguageIds] = useState<number[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [googleId, setGoogleId] = useState<string | null>(null);
  const [hasPassword, setHasPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setLoading(false);
      return;
    }

    fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: MeResponse) => {
        setEmail(data.email);
        setFirstName(data.first_name ?? null);
        setLastName(data.last_name ?? null);
        setIsAdmin(Boolean(data.is_admin));
        setRoles(data.roles ?? []);
        setTeachingSubjectIds(data.teaching_subject_ids ?? []);
        setLanguageIds(data.language_ids ?? []);
        setAvatarUrl(data.avatar_url ?? null);
        setPhoneNumber(data.phone_number ?? null);
        setGoogleId(data.google_id ?? null);
        setHasPassword(Boolean(data.has_password));
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        navigate("/admin/login", { replace: true });
      })
      .finally(() => setLoading(false));
  }, []);

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    navigate("/admin/login", { replace: true });
  }

  return {
    email,
    firstName,
    lastName,
    isAdmin,
    roles,
    teachingSubjectIds,
    languageIds,
    avatarUrl,
    phoneNumber,
    googleId,
    hasPassword,
    loading,
    logout,
  };
}
