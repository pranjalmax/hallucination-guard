// src/App.tsx
import * as React from "react";
import GradientBG from "./components/GradientBG";
import NavBar from "./components/NavBar";
import PageShell from "./components/PageShell";
import BackToTop from "./components/BackToTop";
import { Toaster } from "./components/ui/sonner";
import { ToastProvider } from "./components/ui/use-toast";

export default function App() {
  return (
    <ToastProvider>
      <div className="min-h-screen text-slate-200">
        <GradientBG />
        <NavBar />
        <PageShell />
        <BackToTop />
        <Toaster />
      </div>
    </ToastProvider>
  );
}
