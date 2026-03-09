import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";

const schema = z
  .object({
    username: z.string().min(3, "อย่างน้อย 3 ตัวอักษร"),
    email: z.string().email("รูปแบบอีเมลไม่ถูกต้อง"),
    password: z.string().min(8, "รหัสผ่านอย่างน้อย 8 ตัวอักษร"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "รหัสผ่านไม่ตรงกัน",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export default function Register() {
  const { register: registerUser } = useAuth();
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormValues) => {
    setServerError("");
    try {
      await registerUser(data.username, data.email, data.password);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setServerError(msg ?? "สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 w-full max-w-sm">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">สมัครสมาชิก</h2>
        <p className="text-sm text-gray-500 mb-6">สร้างบัญชีเพื่อเริ่มติดตามรายรับ-รายจ่าย</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {(
            [
              { name: "username", label: "ชื่อผู้ใช้", type: "text", placeholder: "username" },
              { name: "email", label: "อีเมล", type: "email", placeholder: "you@example.com" },
              { name: "password", label: "รหัสผ่าน", type: "password", placeholder: "••••••••" },
              {
                name: "confirmPassword",
                label: "ยืนยันรหัสผ่าน",
                type: "password",
                placeholder: "••••••••",
              },
            ] as const
          ).map(({ name, label, type, placeholder }) => (
            <div key={name}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input
                {...register(name)}
                type={type}
                placeholder={placeholder}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              {errors[name] && (
                <p className="text-red-500 text-xs mt-1">{errors[name]?.message}</p>
              )}
            </div>
          ))}

          {serverError && (
            <p className="text-red-500 text-sm bg-red-50 p-2 rounded-lg">{serverError}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg transition-colors disabled:opacity-60"
          >
            {isSubmitting ? "กำลังสมัคร..." : "สมัครสมาชิก"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-5">
          มีบัญชีแล้ว?{" "}
          <Link to="/login" className="text-brand-600 font-medium hover:underline">
            เข้าสู่ระบบ
          </Link>
        </p>
      </div>
    </div>
  );
}
