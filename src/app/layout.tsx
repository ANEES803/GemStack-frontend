import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css";

import { AppProviders } from "@/components/providers/AppProviders";

/** Bitdefender and some AV extensions inject `bis_skin_checked` on divs before React hydrates, causing false hydration errors. */
const STRIP_EXTENSION_ATTRS_JS = `
(function () {
  var ATTR = "bis_skin_checked";
  function stripTree(root) {
    if (!root) return;
    try {
      if (root.nodeType === 1 && root.removeAttribute && root.hasAttribute(ATTR)) root.removeAttribute(ATTR);
      if (root.querySelectorAll) {
        root.querySelectorAll("[" + ATTR + "]").forEach(function (el) {
          el.removeAttribute(ATTR);
        });
      }
    } catch (e) {}
  }
  stripTree(document.documentElement);
  try {
    new MutationObserver(function (records) {
      records.forEach(function (r) {
        if (r.type === "attributes" && r.attributeName === ATTR) {
          try {
            r.target.removeAttribute(ATTR);
          } catch (e) {}
        }
        if (r.addedNodes) {
          r.addedNodes.forEach(function (n) {
            stripTree(n);
          });
        }
      });
    }).observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: [ATTR],
    });
  } catch (e) {}
  document.addEventListener("DOMContentLoaded", function () {
    stripTree(document.documentElement);
  });
})();
`;

/** Apply persisted theme ASAP to avoid flashes and ensure `dark` works everywhere. */
const APPLY_THEME_EARLY_JS = `
(function () {
  try {
    var key = "gemstack-theme";
    var mode = localStorage.getItem(key);
    var isDark = false;
    if (mode === "dark") isDark = true;
    else if (mode === "light") isDark = false;
    else {
      isDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    var el = document.documentElement;
    if (isDark) el.classList.add("dark");
    else el.classList.remove("dark");
  } catch (e) {}
})();
`;

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GemStack — Gemstone ERP",
  description: "Inventory, sales, and accounting for gemstone trading",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="min-h-full" suppressHydrationWarning>
      <body className={`${inter.variable} min-h-full font-sans antialiased`} suppressHydrationWarning>
        {/*
          Plain <script> in the RSC layout avoids next/script’s HeadManagerContext (breaks when React
          is resolved twice). These IIFEs run at parse time before paint; keep them tiny.
        */}
        <script id="strip-av-extension-attrs" dangerouslySetInnerHTML={{ __html: STRIP_EXTENSION_ATTRS_JS }} />
        <script id="apply-theme-early" dangerouslySetInnerHTML={{ __html: APPLY_THEME_EARLY_JS }} />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
