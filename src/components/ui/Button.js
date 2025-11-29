import React from "react";

const Button = ({
  children,
  onClick,
  variant = "primary",
  className = "",
  disabled = false,
  icon: Icon,
}) => {
  const baseStyle =
    "px-5 py-2.5 rounded-xl font-medium transition-all duration-200 flex items-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100";

  const variants = {
    primary:
      "bg-slate-900 text-white border border-transparent hover:bg-slate-800 shadow-lg shadow-slate-900/20",
    secondary:
      "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm",
    danger:
      "bg-white text-red-600 border border-red-100 hover:bg-red-50 hover:border-red-200",
    ghost:
      "text-slate-500 hover:text-slate-800 hover:bg-slate-100 border-transparent",
    blue: "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyle} ${
        variants[variant] || variants.primary
      } ${className}`}
    >
      {Icon && <Icon size={18} />}
      {children}
    </button>
  );
};

export default Button;
