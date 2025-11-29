import React, { useState, useEffect, useRef } from "react";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  onSnapshot,
  getDocs,
  query,
  where,
  deleteDoc,
} from "firebase/firestore";
import { db, appId } from "../lib/firebase";
import { calculateTotals, generateNumber, formatCurrency } from "../lib/utils";
import { PRICE_DATABASE } from "../lib/constants";
import {
  ArrowLeft,
  Save,
  Printer,
  Mail,
  Percent,
  CheckSquare,
  GripVertical,
  Trash2,
  Plus,
  LayoutGrid,
  Wand2,
  Loader2,
  Edit3,
  Check,
  PenTool,
  CheckCircle2,
  HardHat,
  Hammer,
  ChevronDown,
  FileCheck,
  Cloud,
  Euro,
  Library,
  Search,
  X,
} from "lucide-react";
import Button from "./ui/Button";
import { SignaturePad, EmailModal } from "./ui/Modals";

const Editor = ({
  user,
  docId,
  type = "quote",
  onBack,
  onSaveSuccess,
  onRedirect,
}) => {
  // --- ÉTATS ---
  const [docInfo, setDocInfo] = useState({
    id: null,
    type: type,
    number: "",
    date: new Date().toLocaleDateString("fr-FR"),
    status: "Brouillon",
    signature: null,
    projectAddress: "",
  });

  const [sections, setSections] = useState([]);
  const [client, setClient] = useState({});
  const [clientsList, setClientsList] = useState([]);

  // Paramètres globaux du document (Acompte, Remise)
  const [globalSettings, setGlobalSettings] = useState({
    downPaymentValue: 30,
    downPaymentType: "percent",
    discountValue: 0,
    discountType: "percent",
  });

  // Infos Entreprise (Chargées depuis les paramètres ou par défaut)
  const [companyInfo, setCompanyInfo] = useState({
    name: "BatiFlow",
    address: "Adresse de votre entreprise",
    city: "Code Postal & Ville",
    email: "contact@entreprise.com",
    phone: "01 23 45 67 89",
    logoUrl: null,
  });

  // États pour la Bibliothèque (Catalogue)
  const [libraryItems, setLibraryItems] = useState([]);
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [targetSectionIndex, setTargetSectionIndex] = useState(null);
  const [librarySearch, setLibrarySearch] = useState("");

  // États UI
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showClientSelector, setShowClientSelector] = useState(false);

  // États Auto-Save & AI
  const [lastAutoSave, setLastAutoSave] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // États Drag & Drop
  const [draggedItem, setDraggedItem] = useState(null);
  const [draggedSectionIndex, setDraggedSectionIndex] = useState(null);

  // Ref pour Auto-save
  const dataRef = useRef({ docInfo, sections, client, globalSettings });
  useEffect(() => {
    dataRef.current = { docInfo, sections, client, globalSettings };
  }, [docInfo, sections, client, globalSettings]);

  // --- 1. CHARGEMENT DES DONNÉES ---
  useEffect(() => {
    if (!user) return;

    // Clients
    const unsubClients = onSnapshot(
      collection(db, "artifacts", appId, "users", user.uid, "clients"),
      (snap) => {
        setClientsList(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }
    );

    // Bibliothèque
    const unsubLibrary = onSnapshot(
      collection(db, "artifacts", appId, "users", user.uid, "library"),
      (snap) => {
        setLibraryItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }
    );

    // Paramètres Entreprise
    const loadSettings = async () => {
      try {
        const sSnap = await getDoc(
          doc(db, "artifacts", appId, "users", user.uid, "settings", "general")
        );
        if (sSnap.exists()) {
          const sData = sSnap.data();
          if (sData.company) setCompanyInfo(sData.company);
        }
      } catch (e) {
        console.error("Err chargement settings", e);
      }
    };
    loadSettings();

    // Document
    const loadDocument = async () => {
      if (docId) {
        const collectionName = type === "quote" ? "quotes" : "invoices";
        const snap = await getDoc(
          doc(
            db,
            "artifacts",
            appId,
            "users",
            user.uid,
            collectionName,
            String(docId)
          )
        );
        if (snap.exists()) {
          const data = snap.data();
          setDocInfo({
            id: data.id,
            type: data.type,
            number: data.number,
            date: data.date,
            status: data.status,
            signature: data.signature,
            projectAddress: data.projectAddress || "",
          });
          const loadedSections = (data.sections || []).map((sec) => ({
            ...sec,
            items: sec.items.map((item) => ({
              ...item,
              vat: item.vat !== undefined ? item.vat : 20,
            })),
          }));
          setSections(loadedSections);
          const foundClient = clientsList.find(
            (c) => c.name === data.clientName
          );
          setClient(foundClient || { name: data.clientName || "" });
        }
      } else {
        const newId = Date.now();
        const newNum = generateNumber(type);
        const initialData = {
          id: newId,
          type: type,
          number: newNum,
          date: new Date().toLocaleDateString("fr-FR"),
          validity: "1 mois",
          status: "Brouillon",
          signature: null,
          projectAddress: "",
          clientName: "",
          total: 0,
          sections: [],
        };
        setDocInfo(initialData);
        const collectionName = type === "quote" ? "quotes" : "invoices";
        await setDoc(
          doc(
            db,
            "artifacts",
            appId,
            "users",
            user.uid,
            collectionName,
            String(newId)
          ),
          initialData
        );
      }
    };
    loadDocument();

    // Auto-save interval
    const autoSaveInterval = setInterval(async () => {
      const currentData = dataRef.current;
      if (!user || !currentData.docInfo.id) return;
      try {
        setIsSaving(true);
        const totals = calculateTotals(
          currentData.sections,
          currentData.globalSettings
        );
        const dataToSave = {
          ...currentData.docInfo,
          clientName: currentData.client.name || "",
          total: totals.totalTTC,
          sections: currentData.sections,
        };
        const collectionName = type === "quote" ? "quotes" : "invoices";
        await setDoc(
          doc(
            db,
            "artifacts",
            appId,
            "users",
            user.uid,
            collectionName,
            String(currentData.docInfo.id)
          ),
          dataToSave
        );
        setLastAutoSave(new Date());
        setIsSaving(false);
      } catch (error) {
        console.error("Erreur auto-save", error);
        setIsSaving(false);
      }
    }, 10000);

    return () => {
      unsubClients();
      unsubLibrary();
      clearInterval(autoSaveInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, docId, type]);

  // --- ACTIONS ---
  const handleSave = async () => {
    if (!user || !docInfo.id) return;
    setIsSaving(true);
    const totals = calculateTotals(sections, globalSettings);
    const dataToSave = {
      ...docInfo,
      clientName: client.name || "",
      total: totals.totalTTC,
      sections: sections,
    };
    const collectionName = type === "quote" ? "quotes" : "invoices";
    await setDoc(
      doc(
        db,
        "artifacts",
        appId,
        "users",
        user.uid,
        collectionName,
        String(docInfo.id)
      ),
      dataToSave
    );
    setLastAutoSave(new Date());
    setIsSaving(false);
    if (onSaveSuccess) onSaveSuccess();
  };

  const handleDelete = async () => {
    if (!docInfo.id) return;
    if (
      window.confirm(
        "Êtes-vous sûr de vouloir supprimer définitivement ce document ?"
      )
    ) {
      const collectionName = type === "quote" ? "quotes" : "invoices";
      await deleteDoc(
        doc(
          db,
          "artifacts",
          appId,
          "users",
          user.uid,
          collectionName,
          String(docInfo.id)
        )
      );
      if (onBack) onBack();
    }
  };

  // Conversion Facture Intelligente
  const convertToInvoice = async (invoiceType) => {
    if (!docInfo.id) return;
    const totals = calculateTotals(sections, globalSettings);
    let invoiceSections = [],
      invoiceTotal = 0;
    let alreadyInvoicedAmount = 0;

    // Calcul du déjà facturé
    if (invoiceType === "final") {
      const q = query(
        collection(db, "artifacts", appId, "users", user.uid, "invoices"),
        where("sourceQuote", "==", docInfo.number)
      );
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        alreadyInvoicedAmount += doc.data().total || 0;
      });
    }

    const remainingToPay = totals.totalTTC - alreadyInvoicedAmount;
    if (remainingToPay <= 1) {
      alert("Ce devis est déjà intégralement facturé !");
      return;
    }

    if (invoiceType === "deposit") {
      let depositAmount = 0;
      let depositLabel = "";
      if (globalSettings.downPaymentType === "percent") {
        depositAmount =
          totals.totalTTC * (globalSettings.downPaymentValue / 100);
        depositLabel = `Acompte de ${globalSettings.downPaymentValue}%`;
      } else {
        depositAmount = globalSettings.downPaymentValue;
        depositLabel = `Acompte fixe`;
      }
      if (depositAmount > remainingToPay) {
        alert(`Erreur : Montant acompte trop élevé.`);
        return;
      }
      invoiceTotal = depositAmount;
      invoiceSections = [
        {
          id: Date.now(),
          title: "Facturation d'Acompte",
          items: [
            {
              id: Date.now() + 1,
              nature: "labor",
              desc: `${depositLabel} sur le devis N° ${docInfo.number}`,
              qty: 1,
              unit: "u",
              price: depositAmount / 1.2,
              vat: 20,
            },
          ],
        },
      ];
    } else {
      invoiceSections = JSON.parse(JSON.stringify(sections));
      if (alreadyInvoicedAmount > 0) {
        invoiceSections.push({
          id: Date.now() + 999,
          title: "Déduction Acomptes & Règlements",
          items: [
            {
              id: Date.now() + 1000,
              nature: "material",
              desc: `Déduction des factures d'acompte précédentes`,
              qty: 1,
              unit: "ens",
              price: -(alreadyInvoicedAmount / 1.2),
              vat: 20,
            },
          ],
        });
      }
      invoiceTotal = remainingToPay;
    }

    const newInvoiceId = Date.now();
    const invoiceData = {
      id: newInvoiceId,
      type: "invoice",
      number: generateNumber("invoice"),
      clientName: client.name || "",
      date: new Date().toLocaleDateString("fr-FR"),
      status: "Brouillon",
      sections: invoiceSections,
      total: invoiceTotal,
      sourceQuote: docInfo.number,
      projectAddress: docInfo.projectAddress,
    };
    await setDoc(
      doc(
        db,
        "artifacts",
        appId,
        "users",
        user.uid,
        "invoices",
        String(newInvoiceId)
      ),
      invoiceData
    );
    if (onRedirect) onRedirect(newInvoiceId, "invoice");
  };

  // Envoi Email
  const handleEmailSent = async () => {
    setShowEmailModal(false);
    if (docInfo.id && docInfo.status === "Brouillon") {
      const newStatus = "En attente";
      setDocInfo((prev) => ({ ...prev, status: newStatus }));
      const totals = calculateTotals(sections, globalSettings);
      const dataToSave = {
        ...docInfo,
        status: newStatus,
        clientName: client.name || "",
        total: totals.totalTTC,
        sections: sections,
      };
      const collectionName = type === "quote" ? "quotes" : "invoices";
      await setDoc(
        doc(
          db,
          "artifacts",
          appId,
          "users",
          user.uid,
          collectionName,
          String(docInfo.id)
        ),
        dataToSave
      );
      alert("Document envoyé et passé en statut 'En attente' !");
    } else {
      alert("Document envoyé !");
    }
  };

  // Catalogue
  const handleAddFromLibrary = (item) => {
    if (targetSectionIndex === null) return;
    const newSections = [...sections];
    newSections[targetSectionIndex].items.push({
      id: Date.now(),
      desc: item.desc,
      qty: 1,
      unit: item.unit || "u",
      price: item.price || 0,
      nature: item.nature || "labor",
      vat: 20,
    });
    setSections(newSections);
    setShowLibraryModal(false);
    setLibrarySearch("");
  };
  const filteredLibrary = libraryItems.filter((item) =>
    item.desc.toLowerCase().includes(librarySearch.toLowerCase())
  );

  // IA & Drag
  const handleAIGenerate = () => {
    if (!prompt) return;
    setIsGenerating(true);
    setTimeout(() => {
      const newSections = [];
      if (prompt.includes("peint")) {
        newSections.push({
          id: Date.now(),
          title: "Travaux de Peinture",
          items: PRICE_DATABASE.peinture.map((p, i) => ({
            id: Date.now() + i,
            desc: p.desc,
            nature: p.nature,
            qty: 10,
            unit: p.unit,
            price: p.price,
            vat: 20,
          })),
        });
      } else {
        newSections.push({
          id: Date.now(),
          title: "Ouvrage Généré",
          items: [
            {
              id: Date.now(),
              desc: prompt,
              qty: 1,
              unit: "ens",
              price: 100,
              nature: "labor",
              vat: 20,
            },
          ],
        });
      }
      setSections([...sections, ...newSections]);
      setIsGenerating(false);
      setPrompt("");
    }, 1500);
  };

  const onSectionDragStart = (e, index) => {
    setDraggedSectionIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };
  const onSectionDragOver = (e, index) => {
    e.preventDefault();
    if (draggedSectionIndex === null || draggedSectionIndex === index) return;
    const newSections = [...sections];
    const [movedSection] = newSections.splice(draggedSectionIndex, 1);
    newSections.splice(index, 0, movedSection);
    setSections(newSections);
    setDraggedSectionIndex(index);
  };
  const onSectionDragEnd = () => {
    setDraggedSectionIndex(null);
  };
  const onItemDragStart = (e, sIdx, iIdx) => {
    e.stopPropagation();
    setDraggedItem({ s: sIdx, i: iIdx });
    e.dataTransfer.effectAllowed = "move";
  };
  const onItemDragOver = (e, targetS, targetI) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedItem) return;
    if (draggedItem.s === targetS && draggedItem.i === targetI) return;
    const newSections = sections.map((sec) => ({
      ...sec,
      items: [...sec.items],
    }));
    const sourceList = newSections[draggedItem.s].items;
    const targetList = newSections[targetS].items;
    const [movedItem] = sourceList.splice(draggedItem.i, 1);
    targetList.splice(targetI, 0, movedItem);
    setSections(newSections);
    setDraggedItem({ s: targetS, i: targetI });
  };
  const onItemDragEnd = () => {
    setDraggedItem(null);
  };
  const toggleNature = (sIdx, iIdx, nature) => {
    const newSections = [...sections];
    newSections[sIdx].items[iIdx].nature = nature;
    setSections(newSections);
  };

  const totals = calculateTotals(sections, globalSettings);
  const statusOptions =
    type === "quote"
      ? ["Brouillon", "En attente", "Signé", "Refusé"]
      : ["Brouillon", "En attente", "Payée", "En retard"];
  const getStatusColor = (status) => {
    switch (status) {
      case "Signé":
      case "Payée":
        return "bg-green-100 text-green-700 border-green-200";
      case "En attente":
        return "bg-orange-100 text-orange-700 border-orange-200";
      case "Refusé":
      case "En retard":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-slate-100 text-slate-500 border-slate-200";
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-2 md:p-6 animate-page pb-32">
      {/* MODALE BIBLIOTHEQUE */}
      {showLibraryModal && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in-95"
          onClick={() => setShowLibraryModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Library size={20} className="text-indigo-500" /> Bibliothèque
                de Prix
              </h3>
              <button onClick={() => setShowLibraryModal(false)}>
                <X size={20} className="text-slate-400 hover:text-slate-600" />
              </button>
            </div>
            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={16}
                />
                <input
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Rechercher un article..."
                  value={librarySearch}
                  onChange={(e) => setLibrarySearch(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {filteredLibrary.length === 0 ? (
                <div className="text-center p-8 text-slate-400 text-sm">
                  Aucun article trouvé.
                </div>
              ) : (
                <div className="grid gap-2">
                  {filteredLibrary.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleAddFromLibrary(item)}
                      className="flex items-center justify-between p-3 hover:bg-indigo-50 rounded-xl cursor-pointer border border-transparent hover:border-indigo-100 transition group"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                            item.nature === "labor"
                              ? "bg-blue-50 border-blue-100 text-blue-600"
                              : "bg-amber-50 border-amber-100 text-amber-600"
                          }`}
                        >
                          {item.nature === "labor" ? (
                            <HardHat size={14} />
                          ) : (
                            <Hammer size={14} />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-slate-700">
                            {item.desc}
                          </div>
                          <div className="text-xs text-slate-400">
                            {item.unit}
                          </div>
                        </div>
                      </div>
                      <div className="font-mono font-bold text-indigo-600">
                        {formatCurrency(item.price)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4 print:hidden">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-medium transition hover:bg-slate-100 px-3 py-2 rounded-lg w-fit"
          >
            <ArrowLeft size={18} /> Retour
          </button>
          <div className="text-xs text-slate-400 flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-slate-100 shadow-sm">
            {isSaving ? (
              <>
                <Loader2 size={12} className="animate-spin text-blue-500" />{" "}
                Sauvegarde...
              </>
            ) : lastAutoSave ? (
              <>
                <Cloud size={12} className="text-green-500" /> Sauvegardé à{" "}
                {lastAutoSave.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </>
            ) : (
              <>
                <Cloud size={12} /> Prêt
              </>
            )}
          </div>
        </div>
        <div className="flex gap-2 items-center overflow-x-auto pb-2 md:pb-0 scrollbar-hide w-full md:w-auto">
          {type === "quote" && docInfo.status === "Signé" && (
            <div className="flex gap-2 mr-2 border-r border-slate-200 pr-4">
              <Button
                variant="secondary"
                onClick={() => convertToInvoice("deposit")}
                icon={Percent}
              >
                Fact. Acompte
              </Button>
              <Button
                variant="blue"
                onClick={() => convertToInvoice("final")}
                icon={FileCheck}
              >
                Fact. Solde
              </Button>
            </div>
          )}
          <Button
            variant="secondary"
            onClick={() => window.print()}
            icon={Printer}
            className="whitespace-nowrap"
          >
            Imprimer
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            icon={Save}
            className="whitespace-nowrap"
          >
            Sauvegarder
          </Button>
          <Button
            variant="secondary"
            onClick={() => setShowEmailModal(true)}
            icon={Mail}
            className="whitespace-nowrap"
          >
            Envoyer
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            icon={Trash2}
            className="whitespace-nowrap"
          >
            Supprimer
          </Button>
        </div>
      </div>

      {type === "quote" && (
        <div className="bg-white p-1 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-3 print:hidden">
          <div className="hidden md:flex bg-gradient-to-br from-indigo-600 to-purple-700 w-12 items-center justify-center text-white rounded-lg">
            <Wand2 size={20} />
          </div>
          <div className="flex-1 p-3 flex gap-3 items-center">
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full md:flex-1 bg-transparent text-sm outline-none placeholder-slate-400"
              placeholder="Décrivez les travaux à l'IA..."
            />
            <button
              onClick={handleAIGenerate}
              disabled={isGenerating}
              className="w-full md:w-auto bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <Loader2 className="animate-spin" size={14} />
              ) : (
                <Wand2 size={14} className="md:hidden" />
              )}{" "}
              Générer
            </button>
          </div>
        </div>
      )}

      <div className="bg-white shadow-xl md:shadow-2xl md:rounded-3xl min-h-[600px] md:min-h-[900px] p-4 md:p-12 relative print:shadow-none print:p-0">
        <div className="flex flex-col md:flex-row justify-between mb-8 md:mb-16 border-b border-slate-100 pb-8 gap-6">
          <div className="flex items-start gap-4">
            {companyInfo.logoUrl && (
              <img
                src={companyInfo.logoUrl}
                alt="Logo"
                className="w-20 h-20 object-contain rounded-lg border border-slate-100"
              />
            )}
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tighter mb-2">
                {companyInfo.name}
              </h1>
              <div className="text-slate-500 text-sm font-medium space-y-1">
                <p>{companyInfo.address}</p>
                <p>{companyInfo.city}</p>
                <p className="text-blue-600">{companyInfo.email}</p>
                <p>{companyInfo.phone}</p>
              </div>
            </div>
          </div>
          <div className="w-full md:w-72">
            <div
              className="bg-slate-50 p-4 md:p-5 rounded-xl md:rounded-2xl border border-slate-100 cursor-pointer hover:border-blue-200 transition relative"
              onClick={() => setShowClientSelector(!showClientSelector)}
            >
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                Client
              </div>
              <div className="font-bold text-slate-800 text-lg mb-1">
                {client.name || "Sélectionner..."}
              </div>
              <div className="text-sm text-slate-500">
                {client.address} {client.city}
              </div>
              <div className="absolute top-3 right-3 text-blue-400">
                <Edit3 size={14} />
              </div>
              {showClientSelector && (
                <div className="absolute top-full right-0 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-10 max-h-60 overflow-y-auto">
                  {clientsList.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 hover:bg-slate-50 text-left border-b border-slate-50 last:border-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setClient(c);
                        setShowClientSelector(false);
                      }}
                    >
                      <div className="font-bold text-slate-800 text-sm">
                        {c.name}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 md:mb-12 gap-4">
          <div className="w-full md:w-1/2">
            {isEditingAddress ? (
              <div className="flex gap-2 items-start">
                <textarea
                  className="w-full bg-slate-50 border border-blue-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  rows="3"
                  value={docInfo.projectAddress}
                  onChange={(e) =>
                    setDocInfo({ ...docInfo, projectAddress: e.target.value })
                  }
                />
                <button
                  onClick={() => setIsEditingAddress(false)}
                  className="bg-green-500 text-white p-2 rounded-lg"
                >
                  <Check size={16} />
                </button>
              </div>
            ) : (
              <div
                onClick={() => setIsEditingAddress(true)}
                className="group cursor-pointer"
              >
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                  Lieu des travaux <Edit3 size={12} />
                </div>
                <div className="text-sm text-slate-700 font-medium bg-slate-50 p-3 rounded-xl border border-transparent hover:border-slate-200 transition">
                  {docInfo.projectAddress ||
                    "Adresse identique à la facturation"}
                </div>
              </div>
            )}
          </div>
          <div className="text-left md:text-right w-full md:w-auto">
            <div className="text-2xl md:text-4xl font-bold text-slate-900 mb-1">
              {docInfo.number}
            </div>
            <div className="text-slate-400 font-medium text-sm mb-3">
              Émis le {docInfo.date}
            </div>
            <div className="relative inline-block">
              <select
                value={docInfo.status}
                onChange={(e) =>
                  setDocInfo({ ...docInfo, status: e.target.value })
                }
                className={`appearance-none pl-4 pr-8 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border cursor-pointer transition shadow-sm outline-none ${getStatusColor(
                  docInfo.status
                )}`}
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s} className="bg-white text-slate-800">
                    {s}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-current opacity-50">
                <ChevronDown size={14} />
              </div>
            </div>
          </div>
        </div>

        <div className="mb-12">
          <div className="hidden md:grid grid-cols-12 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest py-4 px-6 rounded-t-2xl">
            <div className="col-span-6">Désignation</div>
            <div className="col-span-2 text-center">Qté</div>
            <div className="col-span-2 text-right">PU HT</div>
            <div className="col-span-2 text-right">Total HT</div>
          </div>
          <div className="border-t-0 md:border border-slate-200 rounded-b-2xl divide-y divide-slate-100">
            {sections.map((section, sIdx) => (
              <div
                key={section.id || sIdx}
                className={`mb-4 md:mb-0 transition-all ${
                  draggedSectionIndex === sIdx
                    ? "opacity-50 bg-slate-50 border-2 border-dashed border-slate-300"
                    : ""
                }`}
                draggable
                onDragStart={(e) => onSectionDragStart(e, sIdx)}
                onDragOver={(e) => onSectionDragOver(e, sIdx)}
                onDragEnd={onSectionDragEnd}
              >
                <div className="bg-slate-100 md:bg-slate-50/80 px-4 md:px-6 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide border-y md:border-b border-slate-200 flex justify-between items-center rounded-t-xl md:rounded-none cursor-move group">
                  <div className="flex items-center gap-2 flex-1">
                    <GripVertical
                      size={14}
                      className="text-slate-300 group-hover:text-slate-500"
                    />
                    <input
                      className="bg-transparent outline-none w-full font-bold text-slate-600"
                      value={section.title}
                      onChange={(e) => {
                        const ns = [...sections];
                        ns[sIdx].title = e.target.value;
                        setSections(ns);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <button
                    onClick={() => {
                      const ns = [...sections];
                      ns.splice(sIdx, 1);
                      setSections(ns);
                    }}
                    className="text-slate-400 hover:text-red-500"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                {section.items.map((item, iIdx) => (
                  <div
                    key={item.id || iIdx}
                    draggable
                    onDragStart={(e) => onItemDragStart(e, sIdx, iIdx)}
                    onDragOver={(e) => onItemDragOver(e, sIdx, iIdx)}
                    onDragEnd={onItemDragEnd}
                    className={`flex flex-col md:grid md:grid-cols-12 px-4 md:px-6 py-4 text-sm items-start bg-white border-x md:border-x-0 border-b border-slate-200 md:border-slate-100 group transition duration-150 ${
                      draggedItem?.s === sIdx && draggedItem?.i === iIdx
                        ? "bg-blue-50/50 opacity-50"
                        : "hover:bg-blue-50/30"
                    }`}
                  >
                    <div className="w-full md:col-span-6 md:pr-4 mb-3 md:mb-0 relative">
                      <div className="absolute -left-4 top-5 text-slate-300 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing hidden md:block">
                        <GripVertical size={14} />
                      </div>
                      <textarea
                        rows={1}
                        className="w-full bg-transparent outline-none resize-none overflow-hidden font-medium text-slate-700"
                        value={item.desc}
                        onChange={(e) => {
                          const ns = [...sections];
                          ns[sIdx].items[iIdx].desc = e.target.value;
                          setSections(ns);
                          e.target.style.height = "auto";
                          e.target.style.height = e.target.scrollHeight + "px";
                        }}
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => toggleNature(sIdx, iIdx, "labor")}
                          className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase transition-colors border ${
                            item.nature === "labor"
                              ? "bg-blue-100 text-blue-700 border-blue-200"
                              : "bg-white text-slate-400 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <HardHat size={12} /> Main d'oeuvre
                        </button>
                        <button
                          onClick={() => toggleNature(sIdx, iIdx, "material")}
                          className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase transition-colors border ${
                            item.nature === "material"
                              ? "bg-amber-100 text-amber-700 border-amber-200"
                              : "bg-white text-slate-400 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <Hammer size={12} /> Matériel
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between w-full md:contents items-center">
                      <div className="flex items-center gap-2 md:col-span-2 md:justify-center">
                        <span className="md:hidden text-xs text-slate-400">
                          Qté:
                        </span>
                        <input
                          className="w-12 text-center bg-slate-100 rounded-md py-1 outline-none font-medium"
                          value={item.qty}
                          onChange={(e) => {
                            const ns = [...sections];
                            ns[sIdx].items[iIdx].qty = Number(e.target.value);
                            setSections(ns);
                          }}
                        />
                        <span className="text-slate-400 text-xs">
                          {item.unit}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 md:col-span-2 md:justify-end">
                        <span className="md:hidden text-xs text-slate-400">
                          Prix:
                        </span>
                        <input
                          className="w-16 md:w-20 text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none"
                          value={item.price}
                          onChange={(e) => {
                            const ns = [...sections];
                            ns[sIdx].items[iIdx].price = Number(e.target.value);
                            setSections(ns);
                          }}
                        />{" "}
                        €
                      </div>
                      <div className="md:col-span-2 text-right font-bold text-slate-800 w-20">
                        {formatCurrency(item.qty * item.price)}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const ns = [...sections];
                        ns[sIdx].items.splice(iIdx, 1);
                        setSections(ns);
                      }}
                      className="md:hidden text-red-300 mt-2 self-end"
                    >
                      <Trash2 size={14} />
                    </button>
                    <button
                      onClick={() => {
                        const ns = [...sections];
                        ns[sIdx].items.splice(iIdx, 1);
                        setSections(ns);
                      }}
                      className="hidden md:block absolute -right-8 top-0.5 p-1.5 rounded-full hover:bg-red-50 text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <div className="px-6 py-3 bg-slate-50/30 border-x border-b border-slate-200 md:border-0 rounded-b-xl md:rounded-none mb-4 md:mb-0 flex items-center gap-2">
                  <button
                    onClick={() => {
                      const ns = [...sections];
                      ns[sIdx].items.push({
                        id: Date.now(),
                        desc: "Nouvel élément",
                        qty: 1,
                        unit: "u",
                        price: 0,
                        nature: "labor",
                        vat: 20,
                      });
                      setSections(ns);
                    }}
                    className="text-xs text-blue-600 font-bold flex items-center gap-1"
                  >
                    <Plus size={14} /> Ajouter une ligne
                  </button>
                  <button
                    onClick={() => {
                      setTargetSectionIndex(sIdx);
                      setShowLibraryModal(true);
                    }}
                    className="text-xs text-indigo-600 font-bold flex items-center gap-1 ml-4 hover:text-indigo-800"
                  >
                    <Library size={14} /> Catalogue
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-center">
            <button
              onClick={() =>
                setSections([
                  ...sections,
                  { id: Date.now(), title: "Nouvelle Section", items: [] },
                ])
              }
              className="text-xs bg-slate-800 text-white px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 font-bold uppercase"
            >
              <LayoutGrid size={14} /> Ajouter une Section
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-end border-t border-slate-100 pt-8 gap-8">
          <div className="w-full md:w-1/3 space-y-6">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>Total HT</span>{" "}
                <span className="font-medium">
                  {formatCurrency(totals.rawTotalHT)}
                </span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>TVA</span>{" "}
                <span className="font-medium">
                  {formatCurrency(totals.totalTVA)}
                </span>
              </div>
              <div className="flex justify-between text-2xl font-extrabold text-slate-900 pt-4 border-t border-slate-200">
                <span>Net à payer</span>{" "}
                <span>{formatCurrency(totals.totalTTC)}</span>
              </div>
            </div>

            {type === "quote" && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 shadow-sm print:border-none print:shadow-none print:p-0 print:bg-transparent mt-4">
                <div className="flex justify-between items-center mb-2 text-blue-800 text-sm font-bold">
                  <span className="flex items-center gap-2">
                    <Percent size={16} /> Acompte requis
                  </span>
                  <div className="flex items-center bg-white border border-blue-200 rounded-lg overflow-hidden w-32 print:border-none">
                    <input
                      type="number"
                      className="w-full outline-none text-right font-bold text-blue-900 px-2 py-1.5 bg-transparent text-sm"
                      value={globalSettings.downPaymentValue}
                      onChange={(e) =>
                        setGlobalSettings({
                          ...globalSettings,
                          downPaymentValue: Number(e.target.value),
                        })
                      }
                    />
                    <select
                      className="bg-white text-blue-600 font-bold text-xs py-0.5 px-1 outline-none border-l border-blue-100 cursor-pointer appearance-none ml-1"
                      value={globalSettings.downPaymentType}
                      onChange={(e) =>
                        setGlobalSettings({
                          ...globalSettings,
                          downPaymentType: e.target.value,
                        })
                      }
                    >
                      <option value="percent">%</option>
                      <option value="fixed">€</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-between items-center text-sm border-t border-blue-100 pt-2 mt-1">
                  <span className="text-blue-600">Montant à régler :</span>
                  <span className="font-mono font-bold text-blue-900 text-lg">
                    {formatCurrency(
                      globalSettings.downPaymentType === "percent"
                        ? totals.totalTTC *
                            (globalSettings.downPaymentValue / 100)
                        : globalSettings.downPaymentValue
                    )}
                  </span>
                </div>
              </div>
            )}

            <div className="mt-8 pt-8 border-t border-slate-100">
              {docInfo.signature ? (
                <div className="text-center p-6 bg-green-50 border border-green-100 rounded-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2">
                    <CheckCircle2 className="text-green-200" size={40} />
                  </div>
                  <div className="text-[10px] font-bold text-green-700 uppercase mb-3 tracking-widest">
                    Bon pour accord
                  </div>
                  <img
                    src={docInfo.signature}
                    className="h-20 mx-auto opacity-90 mix-blend-multiply"
                    alt="Signature"
                  />
                  <div className="text-[10px] text-green-600 mt-3 font-medium">
                    Signé électroniquement le {new Date().toLocaleDateString()}
                  </div>
                </div>
              ) : (
                type === "quote" && (
                  <button
                    onClick={() => setShowSignatureModal(true)}
                    className="w-full py-6 border-2 border-dashed border-slate-300 rounded-xl text-slate-400 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition flex flex-col items-center justify-center gap-3 group print:hidden"
                  >
                    <div className="bg-slate-100 p-3 rounded-full group-hover:bg-blue-100 transition">
                      <PenTool size={24} />
                    </div>
                    <span className="font-bold text-sm">
                      Cliquez pour signer
                    </span>
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {showSignatureModal && (
        <SignaturePad
          onSave={(url) => {
            setDocInfo({ ...docInfo, signature: url, status: "Signé" });
            setShowSignatureModal(false);
          }}
          onCancel={() => setShowSignatureModal(false)}
        />
      )}
      {showEmailModal && (
        <EmailModal
          client={client}
          docNumber={docInfo.number}
          onClose={() => setShowEmailModal(false)}
          onSend={handleEmailSent}
        />
      )}
    </div>
  );
};

export default Editor;
