"use client";

import type { ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const navRef = useRef<HTMLDivElement>(null);
  const [isScrollable, setIsScrollable] = useState(false);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  useEffect(() => {
    const checkScrollable = () => {
      if (navRef.current) {
        const { scrollWidth, clientWidth, scrollLeft } = navRef.current;
        setIsScrollable(scrollWidth > clientWidth);
        setShowLeftArrow(scrollLeft > 0);
        setShowRightArrow(scrollLeft < scrollWidth - clientWidth);
      }
    };

    checkScrollable();
    window.addEventListener("resize", checkScrollable);

    const handleScroll = (e: Event) => {
      if (navRef.current) {
        const { scrollWidth, clientWidth, scrollLeft } = navRef.current;
        setShowLeftArrow(scrollLeft > 0);
        setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1);
      }
    };

    navRef.current?.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("resize", checkScrollable);
      navRef.current?.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleScroll = (direction: "left" | "right") => {
    if (navRef.current) {
      const scrollAmount = 200;
      navRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setTimeout(() => {
      router.push("/login");
      router.refresh();
    }, 100);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="relative flex flex-1 min-w-0">
              {isScrollable && showLeftArrow && (
                <button
                  onClick={() => handleScroll("left")}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 backdrop-blur-sm rounded-full p-1 shadow-md hover:bg-white hover:shadow-lg transition-all duration-200 animate-fade-in"
                  aria-label="Scroll left"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
              )}
              <div
                ref={navRef}
                className="flex overflow-x-auto scrollbar-hide relative min-w-0"
              >
                <div className="flex-shrink-0 flex items-center">
                  <Link
                    href="/"
                    className="hidden sm:block text-xl font-bold text-gray-900 whitespace-nowrap"
                  >
                    Role Allocation
                  </Link>
                </div>
                <nav className="ml-0 sm:ml-6 flex space-x-8 relative">
                  <Link
                    href="/"
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium whitespace-nowrap ${pathname === "/"
                        ? "border-gray-900 text-gray-900"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                  >
                    Home
                  </Link>
                  {user && (
                    <Link
                      href="/preferences"
                      className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium whitespace-nowrap ${pathname === "/preferences"
                          ? "border-gray-900 text-gray-900"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}
                    >
                      Preferences
                    </Link>
                  )}
                  <Link
                    href="/results"
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium whitespace-nowrap ${pathname === "/results"
                        ? "border-gray-900 text-gray-900"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                  >
                    Results
                  </Link>
                  {user?.isAdmin && (
                    <Link
                      href="/admin"
                      className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium whitespace-nowrap ${pathname === "/admin"
                          ? "border-gray-900 text-gray-900"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}
                    >
                      Admin
                    </Link>
                  )}
                </nav>
              </div>
              {isScrollable && showRightArrow && (
                <button
                  onClick={() => handleScroll("right")}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 backdrop-blur-sm rounded-full p-1 shadow-md hover:bg-white hover:shadow-lg transition-all duration-200 animate-fade-in"
                  aria-label="Scroll right"
                >
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
              )}
            </div>
            <div className="flex items-center ml-4 flex-shrink-0">
              {user ? (
                <div className="flex items-center space-x-4">
                  <span className="hidden sm:block text-sm text-gray-700 truncate max-w-[120px]">
                    {user.displayName}
                  </span>
                  <button
                    onClick={handleSignOut}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-gray-700 bg-gray-100 hover:bg-gray-200 whitespace-nowrap"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="flex space-x-4">
                  <Link
                    href="/login"
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-gray-700 bg-gray-100 hover:bg-gray-200 whitespace-nowrap"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-gray-800 hover:bg-gray-700 whitespace-nowrap"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">{children}</div>
      </main>

      <footer className="bg-white">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Student Role Allocation System
          </p>
        </div>
      </footer>
    </div>
  );
}
