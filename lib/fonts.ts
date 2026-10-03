import { Golos_Text, Inter, JetBrains_Mono, Lora, Manrope, Michroma, Montserrat, Onest, Playfair_Display, Unbounded } from "next/font/google";

// Base faces, preloaded.
const inter = Inter({ subsets: ["latin", "cyrillic"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin", "cyrillic"], variable: "--font-jetbrains", display: "swap" });
// Wide geometric face used only for the "ICG" wordmark, echoing the logo.
const brand = Michroma({ subsets: ["latin"], weight: "400", variable: "--font-michroma", display: "swap" });

// Alternatives the admin can switch to (lib/content/fonts.ts). Not preloaded:
// the browser only fetches one when the page actually uses it.
// (next/font needs literal options, hence the repetition.)
const manrope = Manrope({ subsets: ["latin", "cyrillic"], variable: "--font-manrope", display: "swap", preload: false });
const golos = Golos_Text({ subsets: ["latin", "cyrillic"], variable: "--font-golos", display: "swap", preload: false });
const onest = Onest({ subsets: ["latin", "cyrillic"], variable: "--font-onest", display: "swap", preload: false });
const montserrat = Montserrat({ subsets: ["latin", "cyrillic"], variable: "--font-montserrat", display: "swap", preload: false });
const unbounded = Unbounded({ subsets: ["latin", "cyrillic"], variable: "--font-unbounded", display: "swap", preload: false });
const playfair = Playfair_Display({ subsets: ["latin", "cyrillic"], variable: "--font-playfair", display: "swap", preload: false });
const lora = Lora({ subsets: ["latin", "cyrillic"], variable: "--font-lora", display: "swap", preload: false });

/** Class names that define every font's CSS variable; put them on <html>. */
export const fontClassNames = [inter, mono, brand, manrope, golos, onest, montserrat, unbounded, playfair, lora]
  .map((font) => font.variable)
  .join(" ");
