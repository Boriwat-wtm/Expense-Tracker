import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";

const schema = z.object({
  username: z.string().min(3, "อย่างน้อย 3 ตัวอักษร"),
  password: z.string().min(1, "กรุณากรอกรหัสผ่าน"),
});

type FormValues = z.infer<typeof schema>;

export default function Login() {
  const { login } = useAuth();
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormValues) => {
    setServerError("");
    try {
      await login(data.username, data.password);
    } catch {
      setServerError("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 w-full max-w-sm">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">ยินดีต้อนรับ 👋</h2>
        <p className="text-sm text-gray-500 mb-6">เข้าสู่ระบบเพื่อจัดการรายรับ-รายจ่าย</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ชื่อผู้ใช้
            </label>
            <input
              {...register("username")}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="username"
            />
            {errors.username && (
              <p className="text-red-500 text-xs mt-1">{errors.username.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              รหัสผ่าน
            </label>
            <input
              {...register("password")}
              type="password"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
            )}
          </div>

          {serverError && (
            <p className="text-red-500 text-sm bg-red-50 p-2 rounded-lg">{serverError}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg transition-colors disabled:opacity-60"
          >
            {isSubmitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-5">
          ยังไม่มีบัญชี?{" "}
          <Link to="/register" className="text-brand-600 font-medium hover:underline">
            สมัครสมาชิก
          </Link>
        </p>
      </div>
    </div>
  );
}
