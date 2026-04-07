import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";

import "./globals.css";

import { AppToastHost } from "@/components/ui/AppToastHost";

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
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        <Script id="strip-av-extension-attrs" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: STRIP_EXTENSION_ATTRS_JS }} />
        <Script id="apply-theme-early" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: APPLY_THEME_EARLY_JS }} />
        <AppToastHost />
        {children}
      </body>
    </html>
  );
}
