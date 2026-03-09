import { Navigate, Outlet } from "react-router-dom";
import Layout from "@/components/Layout";

export default function ProtectedRoute() {
  const token = localStorage.getItem("access_token");
  if (!token) return <Navigate to="/login" replace />;
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}
