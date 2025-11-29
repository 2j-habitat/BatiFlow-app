import React, { useState, useRef, useEffect } from "react";
import { X, PenTool, Trash2, Mail, Check, Loader2, Send } from "lucide-react";
import Button from "./Button";

export const SignaturePad = ({ onSave, onCancel }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) {
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.strokeStyle = "#000000";
    }
  }, []);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const start = (e) => {
    const { x, y } = getPos(e);
    const ctx = canvasRef.current.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const { x, y } = getPos(e);
    const ctx = canvasRef.current.getContext("2d");
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stop = () => setIsDrawing(false);

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 flex gap-2 items-center">
            <PenTool size={18} className="text-blue-600" /> Signature Client
          </h3>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6">
          <p className="text-sm text-slate-500 mb-3 font-medium">
            Veuillez signer dans le cadre ci-dessous :
          </p>
          <canvas
            ref={canvasRef}
            width={400}
            height={200}
            className="w-full h-48 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 touch-none cursor-crosshair hover:border-blue-300 transition-colors"
            onMouseDown={start}
            onMouseMove={draw}
            onMouseUp={stop}
            onMouseLeave={stop}
            onTouchStart={start}
            onTouchMove={draw}
            onTouchEnd={stop}
          />
          <div className="flex justify-between mt-3 text-xs text-slate-400 font-medium">
            <button
              onClick={() =>
                canvasRef.current.getContext("2d").clearRect(0, 0, 400, 200)
              }
              className="text-red-400 hover:text-red-600 transition flex items-center gap-1"
            >
              <Trash2 size={10} /> Effacer
            </button>
            <span>Lu et approuvé</span>
          </div>
        </div>
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel}>
            Annuler
          </Button>
          <Button
            variant="blue"
            onClick={() => onSave(canvasRef.current.toDataURL())}
          >
            Valider
          </Button>
        </div>
      </div>
    </div>
  );
};

export const EmailModal = ({ client, docNumber, onClose, onSend }) => {
  const [step, setStep] = useState("form");

  const send = () => {
    setStep("sending");
    setTimeout(() => {
      setStep("success");
      setTimeout(onSend, 1500);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 flex gap-2 items-center">
            <Mail size={18} className="text-blue-600" /> Envoyer le document
          </h3>
          <button onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {step === "success" ? (
          <div className="p-12 text-center animate-in zoom-in">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 mx-auto shadow-inner">
              <Check size={40} />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">
              Envoyé avec succès !
            </h3>
            <p className="text-slate-500">
              Le document a bien été transmis à{" "}
              <span className="font-bold text-slate-700">{client.email}</span>.
            </p>
          </div>
        ) : (
          <div className="p-6 space-y-5">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block ml-1">
                Destinataire
              </label>
              <input
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition"
                defaultValue={client.email}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block ml-1">
                Objet
              </label>
              <input
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition"
                defaultValue={`Document ${docNumber} - 2J HABITAT`}
              />
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-end gap-3 mt-8">
              <Button variant="secondary" onClick={onClose}>
                Annuler
              </Button>
              <Button
                variant="blue"
                onClick={send}
                disabled={step === "sending"}
                icon={step === "sending" ? Loader2 : Send}
              >
                {step === "sending" ? "Envoi en cours..." : "Envoyer le mail"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
