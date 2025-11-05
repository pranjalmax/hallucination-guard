import * as React from "react";
import GradientBG from "./components/GradientBG";
import NavBar from "./components/NavBar";
import PageShell from "./components/PageShell";
import { Toaster } from "./components/Toaster";

export default function App() {
  return (
    <>
      <GradientBG />
      <Toaster>
        <NavBar />
        <PageShell />
      </Toaster>
      <footer className="mt-10 mb-6 text-center text-xs text-muted">
        v0.1 — Visual shell only. Functionality arrives in Steps 2–9.
      </footer>
    </>
  );
}
