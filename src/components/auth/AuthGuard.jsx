import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function AuthGuard({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthentication();
  }, [location.pathname]);

  const checkAuthentication = () => {
    // Pokud jsme na access stránce, nepotřebujeme ověřování
    if (location.pathname === createPageUrl("Access")) {
      setIsAuthenticated(true);
      setIsLoading(false);
      return;
    }

    const isAuth = localStorage.getItem("deposit_system_authenticated");
    const loginTime = localStorage.getItem("deposit_system_login_time");

    if (isAuth === "true" && loginTime) {
      // Zkontroluj, zda přihlášení není starší než 24 hodin
      const loginDate = new Date(loginTime);
      const now = new Date();
      const hoursSinceLogin = (now - loginDate) / (1000 * 60 * 60);

      if (hoursSinceLogin < 24) {
        setIsAuthenticated(true);
      } else {
        // Vyčisti stará data a přesměruj na access
        localStorage.removeItem("deposit_system_authenticated");
        localStorage.removeItem("deposit_system_login_time");
        navigate(createPageUrl("Access"));
      }
    } else {
      // Není přihlášen, přesměruj na access
      navigate(createPageUrl("Access"));
    }

    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Ověřování přístupu...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? children : null;
}