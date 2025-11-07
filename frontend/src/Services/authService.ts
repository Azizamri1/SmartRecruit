import api from "./apiClient";

interface LoginData {
  email: string;
  password?: string;
}

interface RegisterData extends LoginData {
  name: string;
}

interface LoginResponse {
  access_token: string;
  token_type: string;
}

export const register = (data: RegisterData) => api.post("/auth/register", data);
export const login = (data: LoginData) => api.post<LoginResponse>("/auth/login", data);
export const forgotPassword = (data: { email: string }) => api.post("/auth/forgot-password", data);
export const getMe = () => api.get("/users/me");

