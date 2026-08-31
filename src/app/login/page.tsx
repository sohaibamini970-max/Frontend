"use client";

import { FormEvent, useState } from "react";
import {
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();

    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        "http://localhost:5000/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim(),
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.message || "Invalid email or password."
        );
        return;
      }

      localStorage.setItem("token", data.token);

      localStorage.setItem(
        "user",
        JSON.stringify(data.user)
      );

    window.dispatchEvent(new Event("storage"));

      router.push("/");
    } catch (error) {
      console.error(error);

      setError(
        "Unable to connect to the server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f5f6f8]">

      <div className="grid min-h-screen lg:grid-cols-2">


        {/* =================================================
            LEFT VISUAL SECTION
        ================================================= */}

        <section className="relative hidden min-h-screen overflow-hidden bg-black lg:block">

          {/* Background Image */}

          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage:
                "url('/Dashboard-Img/loginimage.jpg')",
            }}
          />

          {/* Dark overlay */}

          <div className="absolute inset-0 bg-black/35" />

          {/* Gradient */}

          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/20" />


          {/* =================================================
              LOGO — TOP
          ================================================= */}

          <div className="absolute left-10 top-10 z-20 flex items-center gap-3 xl:left-14 xl:top-14">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 backdrop-blur-md">

              <span className="text-sm font-black text-white">
                ARG
              </span>

            </div>

            <div>

              <p className="text-sm font-bold tracking-wide text-white">
                ARG
              </p>

              <p className="text-[10px] text-gray-400">
                Project Intelligence Platform
              </p>

            </div>

          </div>


          {/* =================================================
              CENTER TEXTUAL CONTENT
          ================================================= */}

          <div className="absolute inset-0 z-10 flex items-center justify-center px-10">

            <div className="w-full max-w-xl text-center">

              {/* Secure Workspace */}

              <div className="mx-auto mb-5 flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 backdrop-blur-md">

                <ShieldCheck
                  size={13}
                  className="text-white"
                />

                <span className="text-[10px] font-semibold text-gray-200">
                  Secure Workspace
                </span>

              </div>


              {/* Main Heading */}

              <h1 className="text-4xl font-semibold leading-tight tracking-tight text-white xl:text-5xl">

                Manage projects.
                <br />

                Empower people.
                <br />

                <span className="text-gray-400">
                  Make better decisions.
                </span>

              </h1>


              {/* Description */}

              <p className="mx-auto mt-5 max-w-lg text-sm leading-6 text-gray-400">

                A centralized workspace for projects, tasks,
                teams, schedules and intelligent management
                insights.

              </p>

            </div>

          </div>

        </section>


        {/* =================================================
            RIGHT LOGIN SECTION
        ================================================= */}

        <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8 lg:px-12">

          <div className="w-full max-w-md">


            {/* =================================================
                MOBILE LOGO
            ================================================= */}

            <div className="mb-10 flex items-center gap-3 lg:hidden">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#07111f] text-xs font-black text-white">

                ARG

              </div>

              <div>

                <p className="text-sm font-bold text-[#07111f]">
                  ARG
                </p>

                <p className="text-[9px] text-gray-400">
                  Project Intelligence Platform
                </p>

              </div>

            </div>


            {/* =================================================
                HEADER
            ================================================= */}

            <div className="mb-8">

              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">
                Welcome Back
              </p>

              <h2 className="text-3xl font-bold tracking-tight text-[#07111f]">
                Sign in to your workspace
              </h2>

              <p className="mt-2 text-sm leading-6 text-gray-500">

                Enter your credentials to continue to the
                project intelligence platform.

              </p>

            </div>


            {/* =================================================
                LOGIN CARD
            ================================================= */}

            <div className="rounded-2xl border border-gray-300 bg-white p-6 shadow-sm sm:p-8">

              <form
                onSubmit={handleLogin}
                className="space-y-5"
              >


                {/* =================================================
                    EMAIL
                ================================================= */}

                <div>

                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-wide text-gray-500">
                    Email Address
                  </label>

                  <div className="relative">

                    <Mail
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                    />

                    <input
                      type="email"
                      value={email}
                      onChange={(e) =>
                        setEmail(e.target.value)
                      }
                      placeholder="you@company.com"
                      autoComplete="email"
                      className="h-12 w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#07111f] focus:ring-4 focus:ring-gray-100"
                    />

                  </div>

                </div>


                {/* =================================================
                    PASSWORD
                ================================================= */}

                <div>

                  <div className="mb-2 flex items-center justify-between">

                    <label className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
                      Password
                    </label>

                    <button
                      type="button"
                      className="text-[10px] font-semibold text-gray-500 hover:text-[#07111f]"
                    >
                      Forgot password?
                    </button>

                  </div>


                  <div className="relative">

                    <LockKeyhole
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                    />

                    <input
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      value={password}
                      onChange={(e) =>
                        setPassword(e.target.value)
                      }
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      className="h-12 w-full rounded-xl border border-gray-300 bg-white pl-10 pr-11 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#07111f] focus:ring-4 focus:ring-gray-100"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(!showPassword)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                    >

                      {showPassword ? (
                        <EyeOff size={17} />
                      ) : (
                        <Eye size={17} />
                      )}

                    </button>

                  </div>

                </div>


                {/* =================================================
                    ERROR
                ================================================= */}

                {error && (

                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">

                    <p className="text-xs font-medium text-red-600">
                      {error}
                    </p>

                  </div>

                )}


                {/* =================================================
                    LOGIN BUTTON
                ================================================= */}

                <button
                  type="submit"
                  disabled={loading}
                  className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#07111f] text-sm font-semibold text-white shadow-sm transition hover:bg-[#111d2d] disabled:cursor-not-allowed disabled:opacity-60"
                >

                  {loading ? (
                    <>

                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />

                      Signing in...

                    </>
                  ) : (
                    <>

                      Sign In

                      <ArrowRight
                        size={16}
                        className="transition-transform group-hover:translate-x-1"
                      />

                    </>
                  )}

                </button>

              </form>


              {/* =================================================
                  SECURITY
              ================================================= */}

              <div className="mt-6 flex items-center justify-center gap-2 border-t border-gray-100 pt-5">

                <ShieldCheck
                  size={14}
                  className="text-gray-400"
                />

                <p className="text-[9px] text-gray-400">
                  Your connection is secured and protected.
                </p>

              </div>

            </div>


            {/* =================================================
                FOOTER
            ================================================= */}

            <p className="mt-6 text-center text-[10px] text-gray-400">

              © 2026 ARG Project & People Intelligence
              Platform

            </p>

          </div>

        </section>

      </div>

    </main>
  );
}


