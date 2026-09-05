"use client";

import { useEffect } from "react";

export default function ScanRefreshBridge() {
  useEffect(() => {
    function refresh() {
      window.dispatchEvent(new Event("opsmind:refresh"));
    }

    window.addEventListener("opsmind:scan-complete", refresh);
    return () => window.removeEventListener("opsmind:scan-complete", refresh);
  }, []);

  return null;
}