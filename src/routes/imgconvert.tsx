import { createFileRoute } from "@tanstack/react-router";
import { Converter } from "@/components/Converter";

export const Route = createFileRoute("/imgconvert")({
  head: () => ({
    meta: [
      { title: "Witness Protection for HEICs — Bulk Image Converter" },
      {
        name: "description",
        content:
          "Give your HEICs a new identity. Bulk-convert HEIC, JPG, PNG, WEBP in your browser — no upload, no signup.",
      },
      { property: "og:title", content: "Witness Protection for HEICs" },
      {
        property: "og:description",
        content: "Bulk-convert HEIC and other formats in your browser. No upload, no signup.",
      },
    ],
  }),
  component: HeicPage,
});

function HeicPage() {
  return (
    <main className="min-h-screen">
      <Converter />
    </main>
  );
}
