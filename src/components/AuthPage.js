import React, { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import {
  CheckCircle2,
  ArrowRight,
  Loader2,
  AlertCircle,
  ShieldAlert,
  CheckSquare,
} from "lucide-react";
import Button from "./ui/Button";

const AuthPage = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await setPersistence(
        auth,
        rememberMe ? browserLocalPersistence : browserSessionPersistence
      );

      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        const user = userCredential.user;

        await setDoc(doc(db, "users", user.uid), {
          email: user.email,
          companyName: companyName,
          role: "owner",
          subscriptionStatus: "inactive",
          createdAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error("Erreur Auth:", err);
      if (err.code === "auth/invalid-email")
        setError("L'adresse email n'est pas valide.");
      else if (
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password" ||
        err.code === "auth/invalid-credential"
      )
        setError("Email ou mot de passe incorrect.");
      else if (err.code === "auth/email-already-in-use")
        setError("Cet email possède déjà un compte.");
      else if (err.code === "auth/weak-password")
        setError("Le mot de passe doit faire au moins 6 caractères.");
      else
        setError(
          "Erreur de connexion. (Vérifiez votre configuration Firebase)"
        );
    }
    setLoading(false);
  };

  const activateDemoMode = () => {
    if (onLoginSuccess) {
      onLoginSuccess({
        uid: "demo-user-123",
        email: email || "demo@batiflow.app",
        isAnonymous: true,
        displayName: companyName || "Entreprise Démo",
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Colonne Gauche (Visuel) */}
      <div className="md:w-1/2 bg-slate-900 text-white p-8 md:p-12 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-purple-600/20 z-0"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            {/* LOGO MODIFIÉ */}
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center font-bold text-xl">
              B
            </div>
            <span className="font-bold text-xl tracking-wide">BatiFlow</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
            Gérez vos chantiers comme un{" "}
            <span className="text-orange-500">Pro</span>.
          </h1>
          <p className="text-slate-400 text-lg mb-8">
            Devis, Factures, Planning et Suivi de chantier. Tout-en-un.
          </p>
          <div className="space-y-4 hidden md:block">
            {[
              "Devis ultra-rapides",
              "Factures conformes",
              "Suivi de chantier",
              "Signature électronique",
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="bg-green-500/20 p-1 rounded-full">
                  <CheckCircle2 size={16} className="text-green-400" />
                </div>
                <span className="font-medium">{item}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 text-xs text-slate-500 mt-8">
          © 2025 BatiFlow SaaS.
        </div>
      </div>

      {/* Colonne Droite (Formulaire) */}
      <div className="md:w-1/2 flex items-center justify-center p-6 animate-page bg-white">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            {isLogin ? "Connexion" : "Inscription Gratuite"}
          </h2>
          <p className="text-slate-500 mb-8">
            {isLogin
              ? "Accédez à votre espace artisan."
              : "Créez votre compte en quelques secondes."}
          </p>

          {error && (
            <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-xl">
              <div className="flex items-center gap-2 text-orange-800 font-bold mb-1">
                <ShieldAlert size={18} /> Attention
              </div>
              <p className="text-sm text-orange-700 mb-3">{error}</p>
              {(error.includes("configuration") ||
                error.includes("Erreur")) && (
                <button
                  onClick={activateDemoMode}
                  className="text-xs bg-orange-200 hover:bg-orange-300 text-orange-900 px-3 py-1.5 rounded font-bold transition"
                >
                  Passer en Mode Démo (Sans connexion)
                </button>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block ml-1">
                  Nom de l'entreprise
                </label>
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition"
                  placeholder="Ex: Durand Rénovation"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block ml-1">
                Email
              </label>
              <input
                type="text"
                inputMode="email"
                autoComplete="email"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition"
                placeholder="votre.nom@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block ml-1">
                Mot de passe
              </label>
              <input
                type="password"
                required
                autoComplete={isLogin ? "current-password" : "new-password"}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div
              className="flex items-center gap-2 cursor-pointer w-fit group"
              onClick={() => setRememberMe(!rememberMe)}
            >
              <div
                className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                  rememberMe
                    ? "bg-blue-600 border-blue-600"
                    : "bg-white border-slate-300 group-hover:border-blue-400"
                }`}
              >
                {rememberMe && <CheckSquare size={14} className="text-white" />}
              </div>
              <span className="text-sm text-slate-600 group-hover:text-slate-800 select-none">
                Rester connecté
              </span>
            </div>

            <Button
              variant="primary"
              className="w-full justify-center py-3 mt-6 shadow-lg shadow-blue-900/20"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : isLogin ? (
                "Se connecter"
              ) : (
                "Créer mon compte"
              )}
              {!loading && <ArrowRight size={18} />}
            </Button>
          </form>

          <div className="mt-8 text-center text-sm text-slate-500">
            {isLogin ? "Pas encore de compte ?" : "Déjà inscrit ?"}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
              }}
              className="text-blue-600 font-bold ml-2 hover:underline"
            >
              {isLogin ? "S'inscrire" : "Se connecter"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
