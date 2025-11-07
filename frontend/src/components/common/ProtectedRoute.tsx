import { Navigate } from "react-router-dom";
import { getToken } from "../../Services/apiClient";

type Props = {
  children: React.ReactNode;
  adminOnly?: boolean;                        // backwards-compat
  roles?: Array<"admin" | "company" | "candidate">;  // new: allow multiple roles
};

type Me = {
  is_admin?: boolean;
  account_type?: "admin" | "company" | "candidate";
  company_name?: string | null;
};

function readMe(): Me | null {
  try {
    const raw = localStorage.getItem("me");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function ProtectedRoute({ children, adminOnly, roles }: Props) {
  const token = getToken();
  if (!token) return <Navigate to="/auth/signin" replace />;

  const me = readMe();

  // Legacy flag still works
  if (adminOnly) {
    if (!me?.is_admin) return <Navigate to="/jobs" replace />;
    return <>{children}</>;
  }

  // Role list (admin OR company OR candidate)
  if (roles && roles.length > 0) {
    const userRole: "admin" | "company" | "candidate" =
      me?.is_admin ? "admin" : (me?.account_type ?? (me?.company_name ? "company" : "candidate"));
    if (!roles.includes(userRole)) return <Navigate to="/jobs" replace />;
  }

  return <>{children}</>;
}

