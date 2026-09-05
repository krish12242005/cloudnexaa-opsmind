import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cloudnexaa OpsMind",
    short_name: "OpsMind",
    description: "Cloudnexaa cloud operations control center",
    start_url: "/",
    display: "standalone",
    background_color: "#040404",
    theme_color: "#040404",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/opsmind-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}