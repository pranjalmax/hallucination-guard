// src/components/Toaster.tsx
// Simple bridge so any old imports keep working.
// We re-export the new Toaster that lives at ui/sonner.

import ToasterNamed, { Toaster } from "./ui/sonner";

export { Toaster };
export default ToasterNamed;
