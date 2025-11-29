import React, { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
// CORRECTION : Ajout de 'X' dans les imports pour éviter le crash
import {
  Check,
  Star,
  Shield,
  Zap,
  Loader2,
  X,
  Crown,
  HardHat,
  Lock,
} from "lucide-react";
import Button from "./ui/Button";

const SubscriptionPage = ({ user, onSubscriptionComplete }) => {
  const [loading, setLoading] = useState(null);
  const [billingCycle, setBillingCycle] = useState("monthly");

  const handleSubscribe = async (planId) => {
    setLoading(planId);
    const fullPlanId = `${planId}_${billingCycle}`;

    setTimeout(async () => {
      try {
        if (user.uid && !user.isAnonymous) {
          await updateDoc(doc(db, "users", user.uid), {
            subscriptionStatus: "active",
            plan: fullPlanId,
            subscriptionDate: new Date().toISOString(),
          });
        }
        onSubscriptionComplete(fullPlanId);
      } catch (error) {
        console.error("Erreur activation (Mode Démo):", error);
        onSubscriptionComplete(fullPlanId);
      }
      setLoading(null);
    }, 2000);
  };

  const prices = {
    pro: billingCycle === "monthly" ? 10 : 96,
    business: billingCycle === "monthly" ? 15 : 144,
  };

  const periodLabel = billingCycle === "monthly" ? "/mois" : "/an";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 animate-page pb-24">
      <div className="text-center mb-10 max-w-2xl">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
          Choisissez votre offre
        </h1>
        <p className="text-slate-500 text-lg">
          Des tarifs adaptés à la taille de votre activité. Changez à tout
          moment.
        </p>
      </div>

      <div className="bg-white p-1 rounded-xl border border-slate-200 flex items-center mb-10 shadow-sm">
        <button
          onClick={() => setBillingCycle("monthly")}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
            billingCycle === "monthly"
              ? "bg-slate-900 text-white shadow-md"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Mensuel
        </button>
        <button
          onClick={() => setBillingCycle("yearly")}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
            billingCycle === "yearly"
              ? "bg-slate-900 text-white shadow-md"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Annuel{" "}
          <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full">
            -20%
          </span>
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-6xl w-full items-start">
        {/* SOLO */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition relative">
          <h3 className="text-lg font-bold text-slate-800 mb-2">Découverte</h3>
          <div className="flex items-baseline gap-1 mb-6">
            <span className="text-3xl font-extrabold text-slate-900">0€</span>
            <span className="text-slate-400 text-sm">/mois</span>
          </div>
          <ul className="space-y-3 mb-8">
            <li className="flex items-center gap-2 text-sm text-slate-600">
              <Check size={16} className="text-green-500" /> 3 Devis / mois
            </li>
            <li className="flex items-center gap-2 text-sm text-slate-600">
              <Check size={16} className="text-green-500" /> Facturation simple
            </li>
            <li className="flex items-center gap-2 text-sm text-slate-400 opacity-50">
              <X size={16} /> Pas d'IA générative
            </li>
            <li className="flex items-center gap-2 text-sm text-slate-400 opacity-50">
              <X size={16} /> Pas de suivi chantier
            </li>
          </ul>
          <Button
            variant="secondary"
            className="w-full justify-center"
            onClick={() => onSubscriptionComplete("free")}
          >
            Continuer Gratuitement
          </Button>
        </div>

        {/* PRO */}
        <div className="bg-white p-6 rounded-3xl border-2 border-blue-100 shadow-lg relative transform md:-translate-y-4">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-blue-500"></div>
          <h3 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
            <Star size={18} className="text-blue-500 fill-blue-500" /> Artisan
            Pro
          </h3>
          <div className="flex items-baseline gap-1 mb-6">
            <span className="text-4xl font-extrabold text-slate-900">
              {prices.pro}€
            </span>
            <span className="text-slate-400 text-sm">{periodLabel}</span>
          </div>
          <ul className="space-y-3 mb-8">
            <li className="flex items-center gap-2 text-sm text-slate-700 font-medium">
              <Check size={16} className="text-blue-500" />{" "}
              <strong>Devis & Factures Illimités</strong>
            </li>
            <li className="flex items-center gap-2 text-sm text-slate-700">
              <Check size={16} className="text-blue-500" /> IA Générative
              Standard
            </li>
            <li className="flex items-center gap-2 text-sm text-slate-700">
              <Check size={16} className="text-blue-500" /> Mode Équipe (2 max)
            </li>
            <li className="flex items-center gap-2 text-sm text-slate-400 opacity-50">
              <X size={16} /> Pas de suivi de chantier
            </li>
          </ul>
          <Button
            variant="primary"
            className="w-full justify-center bg-blue-600 hover:bg-blue-700 shadow-blue-200"
            onClick={() => handleSubscribe("pro")}
            disabled={loading}
          >
            {loading === "pro" ? (
              <Loader2 className="animate-spin" />
            ) : (
              "Choisir Pro"
            )}
          </Button>
        </div>

        {/* BUSINESS */}
        <div className="bg-slate-900 p-6 rounded-3xl shadow-xl relative transform md:-translate-y-8 border border-slate-800">
          <div className="absolute top-4 right-4 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg animate-pulse">
            Best Seller
          </div>
          <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
            <Crown size={18} className="text-yellow-400 fill-yellow-400" />{" "}
            Business
          </h3>
          <div className="flex items-baseline gap-1 mb-6">
            <span className="text-5xl font-extrabold text-white">
              {prices.business}€
            </span>
            <span className="text-slate-400 text-sm">{periodLabel}</span>
          </div>
          <ul className="space-y-4 mb-8">
            <li className="flex items-center gap-2 text-sm text-white font-bold">
              <Check size={16} className="text-green-400" /> Tout ce qu'il y a
              dans Pro
            </li>
            <li className="flex items-center gap-2 text-sm text-white">
              <HardHat size={16} className="text-orange-400" />{" "}
              <strong>Suivi de Chantier</strong>
            </li>
            <li className="flex items-center gap-2 text-sm text-slate-300">
              <Check size={16} className="text-blue-400" /> Photos & Documents
              illimités
            </li>
            <li className="flex items-center gap-2 text-sm text-slate-300">
              <Check size={16} className="text-blue-400" /> Équipe illimitée
            </li>
          </ul>
          <Button
            variant="primary"
            className="w-full justify-center py-3 text-base bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 border-none shadow-orange-900/50"
            onClick={() => handleSubscribe("business")}
            disabled={loading}
          >
            {loading === "business" ? (
              <Loader2 className="animate-spin" />
            ) : (
              "Prendre le Business"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPage;
