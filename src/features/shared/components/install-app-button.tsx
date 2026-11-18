"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

function subscribeToInstallMode(onChange: () => void): () => void {
  const displayMode = window.matchMedia("(display-mode: standalone)");
  displayMode.addEventListener("change", onChange);
  window.addEventListener("appinstalled", onChange);

  return () => {
    displayMode.removeEventListener("change", onChange);
    window.removeEventListener("appinstalled", onChange);
  };
}

function isIosDevice(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function subscribeToNothing(): () => void {
  return () => {};
}

export function InstallAppButton() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showIosInstructions, setShowIosInstructions] = useState(false);
  const [installError, setInstallError] = useState("");
  const isInstalled = useSyncExternalStore(
    subscribeToInstallMode,
    isStandalone,
    () => true,
  );
  const isIosBrowser = useSyncExternalStore(
    subscribeToNothing,
    isIosDevice,
    () => false,
  );

  useEffect(() => {
    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
    };
  }, []);

  async function installApp() {
    if (isIosBrowser) {
      setShowIosInstructions((visible) => !visible);
      return;
    }
    if (!installPrompt) {
      return;
    }

    try {
      await installPrompt.prompt();
      await installPrompt.userChoice;
      setInstallPrompt(null);
    } catch {
      setInstallError("Não foi possível iniciar a instalação neste navegador.");
    }
  }

  if (isInstalled || (!installPrompt && !isIosBrowser)) {
    return null;
  }

  return (
    <div className="mt-6 border-t border-primary/10 pt-5">
      <button
        className="w-full rounded-xl border border-primary/20 px-4 py-3 text-sm font-semibold text-primary transition-colors hover:bg-soft-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        onClick={installApp}
        type="button"
      >
        {isIosBrowser
          ? showIosInstructions
            ? "Ocultar instruções de instalação"
            : "Como adicionar à Tela de Início"
          : "Instalar Chamadas"}
      </button>
      {showIosInstructions && (
        <p
          className="mt-3 rounded-xl bg-soft-blue px-4 py-3 text-sm leading-6 text-primary"
          role="status"
        >
          No navegador, toque em <strong>Compartilhar</strong> e depois em{" "}
          <strong>Adicionar à Tela de Início</strong>.
        </p>
      )}
      {installError && (
        <p className="mt-3 text-sm text-absent" role="alert">
          {installError}
        </p>
      )}
    </div>
  );
}
