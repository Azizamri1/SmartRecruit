import apiClient from "./apiClient";

export type CompanyMe = {
  id: number;
  email: string;
  is_admin: boolean;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  date_of_birth?: string | null;
  account_type?: string | null;
  company_name?: string | null;
  company_logo_url?: string | null;
  company_description?: string | null;
  sector?: string | null;
  location_city?: string | null;     // NEW
  location_country?: string | null;  // NEW
  company_website?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  profile_picture_url?: string | null;
};

export async function getCompanyMe() {
  const { data } = await apiClient.get("/company/me");
  return data;
}

export async function updateCompanyMe(payload: {
  company_name?: string;
  sector?: string;
  overview?: string;
  logo_url?: string | null;
  location_city?: string | null;
  location_country?: string | null;
  company_website?: string | null;
}) {
  const { data } = await apiClient.patch("/company/me", payload);
  return data;
}

export async function uploadCompanyLogo(file: File) {
  const fd = new FormData();
  fd.append("file", file);
  const { data } = await apiClient.post("/company/logo", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data as { company_logo_url: string };
}

export interface PublicCompany {
  id: number;
  name?: string | null;
  logo_url?: string | null;
  company_overview?: string | null;
}

export async function getCompanyByUserId(userId: number): Promise<PublicCompany | null> {
  try {
    // âœ… match your backend: singular "company"
    const { data } = await apiClient.get(`/company/by-user/${userId}`);
    return data;
  } catch (e) {
    // stay silent and return null so UI never crashes
    return null;
  }
}

