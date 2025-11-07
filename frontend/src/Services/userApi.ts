import api from "./apiClient";

export async function changePassword(current_password: string, new_password: string) {
  const { data } = await api.post("/users/me/change-password", { current_password, new_password });
  return data;
}

export async function changeEmail(password: string, new_email: string) {
  const { data } = await api.post("/users/me/change-email", { password, new_email });
  return data;
}

export async function getMe() {
  const { data } = await api.get("/users/me");
  return data;
}

export async function patchMe(payload: {
  full_name?: string;
  linkedin_url?: string | null;
  github_url?: string | null;
}) {
  const { data } = await api.patch("/users/me", payload);
  return data;
}

export async function uploadAvatar(file: File): Promise<{ profile_picture_url: string }> {
  const fd = new FormData();
  fd.append("file", file);
  const { data } = await api.post("/users/me/avatar", fd);
  return data;
}

