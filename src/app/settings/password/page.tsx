"use client";

import React, { useState } from "react";
import {
    ArrowLeft,
    CheckCircle2,
    Eye,
    EyeOff,
    LockKeyhole,
    Loader2,
    AlertCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";

const API_BASE = "https://backend-five-swart-88.vercel.app/api";

export default function ChangePasswordPage() {
    const router = useRouter();

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] =
        useState(false);

    const [loading, setLoading] = useState(false);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    /* =========================================================
       CHANGE PASSWORD
    ========================================================= */

    const handleChangePassword = async (
        e: React.FormEvent
    ) => {
        e.preventDefault();

        setError("");
        setSuccess("");

        if (!password || !confirmPassword) {
            setError("Please enter your new password.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        if (password.length < 8) {
            setError(
                "Password must be at least 8 characters long."
            );
            return;
        }

        const token = localStorage.getItem("token");

        if (!token) {
            router.push("/login");
            return;
        }

        try {
            setLoading(true);

            const response = await fetch(
                `${API_BASE}/auth/change-password`,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },

                    body: JSON.stringify({
                        password,
                        confirmPassword,
                    }),
                }
            );

            const data = await response.json();

            if (response.status === 401) {
                localStorage.removeItem("token");
                localStorage.removeItem("user");

                router.push("/login");
                return;
            }

            if (!response.ok) {
                throw new Error(
                    data?.message ||
                    "Failed to change password."
                );
            }

            setSuccess(
                data?.message ||
                "Password changed successfully."
            );

            setPassword("");
            setConfirmPassword("");

        } catch (error) {
            console.error(
                "Change password error:",
                error
            );

            setError(
                error instanceof Error
                    ? error.message
                    : "Something went wrong."
            );
        } finally {
            setLoading(false);
        }
    };

    /* =========================================================
       PAGE
    ========================================================= */

    return (
        <main className="min-h-screen bg-[#DEDAD9]">
            <div className="mx-auto max-w-[1440px] px-5 py-5 sm:px-8 lg:px-10">

                {/* =================================================
            BACK
        ================================================= */}

                <button
                    onClick={() => router.back()}
                    className="mb-5 flex items-center gap-2 text-[11px] font-medium text-gray-600 transition hover:text-black"
                >
                    <ArrowLeft size={15} />
                    Back
                </button>

                {/* =================================================
            CARD
        ================================================= */}

                <div className="mx-auto max-w-[620px]">

                    <section className="rounded-2xl bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)] sm:p-7">

                        {/* HEADER */}

                        <div className="mb-7 flex items-start gap-3">

                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#edf2ff] text-[#557bd2]">
                                <LockKeyhole size={20} />
                            </div>

                            <div>
                                <h1 className="text-[17px] font-semibold text-[#18181b]">
                                    Change Password
                                </h1>

                                <p className="mt-1 text-[10px] leading-5 text-gray-400">
                                    Create a new password to keep your
                                    account secure.
                                </p>
                            </div>

                        </div>

                        {/* SUCCESS */}

                        {success && (
                            <div className="mb-5 flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3">

                                <CheckCircle2
                                    size={16}
                                    className="mt-0.5 shrink-0 text-green-600"
                                />

                                <p className="text-[10px] font-medium text-green-700">
                                    {success}
                                </p>

                            </div>
                        )}

                        {/* ERROR */}

                        {error && (
                            <div className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">

                                <AlertCircle
                                    size={16}
                                    className="mt-0.5 shrink-0 text-red-500"
                                />

                                <p className="text-[10px] font-medium text-red-600">
                                    {error}
                                </p>

                            </div>
                        )}

                        {/* FORM */}

                        <form
                            onSubmit={handleChangePassword}
                            className="space-y-5"
                        >

                            {/* NEW PASSWORD */}

                            <div>

                                <label className="mb-2 block text-[10px] font-semibold text-gray-700">
                                    New Password
                                </label>

                                <div className="relative">

                                    <input
                                        type={
                                            showPassword
                                                ? "text"
                                                : "password"
                                        }
                                        value={password}
                                        onChange={(e) =>
                                            setPassword(
                                                e.target.value
                                            )
                                        }
                                        placeholder="Enter new password"
                                        autoComplete="new-password"
                                        className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-3 pr-11 text-[11px] text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#557bd2] focus:ring-2 focus:ring-[#557bd2]/10"
                                    />

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowPassword(
                                                !showPassword
                                            )
                                        }
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-700"
                                    >
                                        {showPassword ? (
                                            <EyeOff size={15} />
                                        ) : (
                                            <Eye size={15} />
                                        )}
                                    </button>

                                </div>

                                <p className="mt-1.5 text-[9px] text-gray-400">
                                    Password must contain at least 8
                                    characters.
                                </p>

                            </div>

                            {/* CONFIRM PASSWORD */}

                            <div>

                                <label className="mb-2 block text-[10px] font-semibold text-gray-700">
                                    Confirm Password
                                </label>

                                <div className="relative">

                                    <input
                                        type={
                                            showConfirmPassword
                                                ? "text"
                                                : "password"
                                        }
                                        value={confirmPassword}
                                        onChange={(e) =>
                                            setConfirmPassword(
                                                e.target.value
                                            )
                                        }
                                        placeholder="Confirm new password"
                                        autoComplete="new-password"
                                        className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-3 pr-11 text-[11px] text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#557bd2] focus:ring-2 focus:ring-[#557bd2]/10"
                                    />

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowConfirmPassword(
                                                !showConfirmPassword
                                            )
                                        }
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-700"
                                    >
                                        {showConfirmPassword ? (
                                            <EyeOff size={15} />
                                        ) : (
                                            <Eye size={15} />
                                        )}
                                    </button>

                                </div>

                            </div>

                            {/* PASSWORD MATCH */}

                            {confirmPassword && (
                                <div>
                                    {password ===
                                        confirmPassword ? (
                                        <p className="text-[9px] font-medium text-green-600">
                                            ✓ Passwords match
                                        </p>
                                    ) : (
                                        <p className="text-[9px] font-medium text-red-500">
                                            Passwords do not match
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* BUTTON */}

                            <button
                                type="submit"
                                disabled={loading}
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#557bd2] py-3 text-[10px] font-semibold text-white transition hover:bg-[#456bc2] disabled:cursor-not-allowed disabled:opacity-60"
                            >

                                {loading ? (
                                    <>
                                        <Loader2
                                            size={14}
                                            className="animate-spin"
                                        />
                                        Changing Password...
                                    </>
                                ) : (
                                    <>
                                        <LockKeyhole size={14} />
                                        Change Password
                                    </>
                                )}

                            </button>

                        </form>

                    </section>

                </div>

            </div>
        </main>
    );
}
