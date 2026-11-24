import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WheelDrafter",
    short_name: "WheelDrafter",
    description: "Spin the wheels of fate to build a one-of-a-kind legend.",
    start_url: "./", // relative to the manifest, so it works under the /games/wheeldrafter basePath
    display: "standalone",
    background_color: "#060606",
    theme_color: "#060606",
    icons: [{ src: "icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
