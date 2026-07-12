import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Access() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Přístupové heslo - v produkci by mělo být v bezpečnějším úložišti
  const ACCESS_PASSWORD = "DepositAccess2024!";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    // Simulace krátké prodlevy pro zabezpečení
    await new Promise(resolve => setTimeout(resolve, 500));

    if (password === ACCESS_PASSWORD) {
      // Uložení přihlášení do localStorage
      localStorage.setItem("deposit_system_authenticated", "true");
      localStorage.setItem("deposit_system_login_time", new Date().toISOString());
      
      // Přesměrování na hlavní stránku
      navigate(createPageUrl("Dashboard"));
    } else {
      setError("Nesprávné heslo. Zkuste to prosím znovu.");
    }
    
    setIsSubmitting(false);
  };

  return (
    <>
      <div className="container">
        <img src="/Logo 500x500  px (20).png" alt="RAS logo" className="logo" />
        <h1>RAS</h1>
        <h2>Registr Aktivní Správy</h2>
        <div className="login-box">
            <form onSubmit={handleSubmit}>
                <label htmlFor="password">Heslo</label>
                <input 
                  type="password" 
                  id="password" 
                  name="password" 
                  placeholder="Zadejte heslo" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                />
                <button type="submit" disabled={isSubmitting || !password}>
                  {isSubmitting ? "Ověřování..." : "Přihlásit se"}
                </button>
            </form>
            {error && <p className="error-message">{error}</p>}
        </div>
        <div className="footer">
            &copy; 2025 RAS – Registr Aktivní Správy. Všechna práva vyhrazena.
        </div>
      </div>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css?family=Roboto:400,700&display=swap');
        
        body {
            background: #f7fafd;
            font-family: 'Roboto', Arial, sans-serif;
            margin: 0;
            padding: 0;
        }
        .container {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            padding: 20px;
            box-sizing: border-box;
        }
        .logo {
            width: 180px;
            margin-bottom: 32px;
        }
        h1 {
            color: #153354;
            font-size: 2.4rem;
            margin: 0 0 10px 0;
            font-weight: 700;
            letter-spacing: 1px;
            text-align: center;
        }
        h2 {
            color: #226486;
            font-size: 1.2rem;
            font-weight: 400;
            margin-bottom: 32px;
            text-align: center;
        }
        .login-box {
            background: #fff;
            padding: 32px 32px 24px 32px;
            border-radius: 12px;
            box-shadow: 0 6px 32px rgba(21,51,84,0.07);
            min-width: 320px;
            box-sizing: border-box;
        }
        .login-box label {
            display: block;
            color: #153354;
            margin-bottom: 6px;
            font-size: 1rem;
        }
        .login-box input {
            width: 100%;
            padding: 10px;
            margin-bottom: 18px;
            border: 1px solid #c0cedb;
            border-radius: 6px;
            font-size: 1rem;
            box-sizing: border-box;
        }
        .login-box button {
            width: 100%;
            background: #0db3b3;
            color: #fff;
            border: none;
            border-radius: 6px;
            font-size: 1.05rem;
            padding: 12px 0;
            cursor: pointer;
            font-weight: bold;
            transition: background 0.2s;
        }
        .login-box button:hover {
            background: #179b9b;
        }
        .login-box button:disabled {
            background: #94a3b8;
            cursor: not-allowed;
            opacity: 0.7;
        }
        .footer {
            margin-top: 48px;
            color: #94a3b8;
            font-size: 0.98rem;
            text-align: center;
        }
        .error-message {
            color: #e53e3e;
            font-size: 0.9rem;
            text-align: center;
            margin-top: 16px;
        }
        @media (max-width: 480px) {
            .login-box {
                min-width: unset;
                width: 90vw;
                padding: 24px;
            }
            .logo {
                width: 120px;
            }
            h1 {
                font-size: 2rem;
            }
            h2 {
                font-size: 1.1rem;
            }
        }
      `}</style>
    </>
  );
}