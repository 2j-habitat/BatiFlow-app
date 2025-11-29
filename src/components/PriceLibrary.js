import React, { useState, useEffect } from "react";
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db, appId } from "../lib/firebase";
import { formatCurrency } from "../lib/utils";
import { Library, Plus, Search, Trash2, HardHat, Hammer } from "lucide-react";
import Button from "./ui/Button";

const PriceLibrary = ({ user }) => {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [newItem, setNewItem] = useState({
    desc: "",
    price: "",
    unit: "m²",
    nature: "labor",
  });

  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(
      collection(db, "artifacts", appId, "users", user.uid, "library"),
      (snapshot) => {
        setItems(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      }
    );
    return () => unsubscribe();
  }, [user]);

  const handleAddItem = async () => {
    if (!newItem.desc || !newItem.price) return;
    await addDoc(
      collection(db, "artifacts", appId, "users", user.uid, "library"),
      {
        ...newItem,
        price: parseFloat(newItem.price),
        createdAt: new Date().toISOString(),
      }
    );
    setNewItem({ desc: "", price: "", unit: "m²", nature: "labor" });
    setShowForm(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Supprimer cet élément du catalogue ?")) {
      await deleteDoc(
        doc(db, "artifacts", appId, "users", user.uid, "library", id)
      );
    }
  };

  const filteredItems = items.filter((i) =>
    i.desc.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 animate-page pb-24">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-slate-800 flex gap-2 items-center">
          <Library className="text-indigo-500" /> Bibliothèque de Prix
        </h2>
        <Button
          onClick={() => setShowForm(!showForm)}
          icon={Plus}
          className="text-xs md:text-sm"
        >
          Ajouter Article
        </Button>
      </div>

      {/* Formulaire Ajout */}
      {showForm && (
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100 mb-8 animate-in slide-in-from-top-4">
          <h3 className="font-bold text-lg mb-4 text-slate-700">
            Nouvel Article
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">
                Désignation
              </label>
              <input
                className="w-full border bg-slate-50 rounded-lg p-2 outline-none focus:ring-2 focus:ring-indigo-500"
                value={newItem.desc}
                onChange={(e) =>
                  setNewItem({ ...newItem, desc: e.target.value })
                }
                placeholder="Ex: Pose placo..."
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">
                Prix Unitaire (€)
              </label>
              <input
                type="number"
                className="w-full border bg-slate-50 rounded-lg p-2 outline-none focus:ring-2 focus:ring-indigo-500"
                value={newItem.price}
                onChange={(e) =>
                  setNewItem({ ...newItem, price: e.target.value })
                }
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">
                Unité
              </label>
              <select
                className="w-full border bg-slate-50 rounded-lg p-2 outline-none"
                value={newItem.unit}
                onChange={(e) =>
                  setNewItem({ ...newItem, unit: e.target.value })
                }
              >
                <option value="m²">m²</option>
                <option value="ml">ml</option>
                <option value="u">Unité</option>
                <option value="h">Heure</option>
                <option value="ens">Ensemble</option>
              </select>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <button
                onClick={() => setNewItem({ ...newItem, nature: "labor" })}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-2 transition ${
                  newItem.nature === "labor"
                    ? "bg-blue-100 text-blue-700 border-blue-200"
                    : "bg-white text-slate-500 border-slate-200"
                }`}
              >
                <HardHat size={14} /> Main d'oeuvre
              </button>
              <button
                onClick={() => setNewItem({ ...newItem, nature: "material" })}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-2 transition ${
                  newItem.nature === "material"
                    ? "bg-amber-100 text-amber-700 border-amber-200"
                    : "bg-white text-slate-500 border-slate-200"
                }`}
              >
                <Hammer size={14} /> Matériel
              </button>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setShowForm(false)}>
                Annuler
              </Button>
              <Button variant="primary" onClick={handleAddItem}>
                Enregistrer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Liste */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={16}
            />
            <input
              className="pl-10 pr-4 py-2 w-full text-sm bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition"
              placeholder="Rechercher un article..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
        </div>

        <div className="divide-y divide-slate-50">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-4 hover:bg-slate-50 transition group"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                    item.nature === "labor"
                      ? "bg-blue-50 border-blue-100 text-blue-600"
                      : "bg-amber-50 border-amber-100 text-amber-600"
                  }`}
                >
                  {item.nature === "labor" ? (
                    <HardHat size={18} />
                  ) : (
                    <Hammer size={18} />
                  )}
                </div>
                <div>
                  <div className="font-bold text-slate-800">{item.desc}</div>
                  <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">
                    {item.nature === "labor" ? "Main d'oeuvre" : "Fourniture"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="font-mono font-bold text-slate-700">
                    {formatCurrency(item.price)}
                  </div>
                  <div className="text-xs text-slate-400">/ {item.unit}</div>
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition p-2"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
          {filteredItems.length === 0 && (
            <div className="p-12 text-center text-slate-400">
              Aucun article trouvé.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PriceLibrary;
