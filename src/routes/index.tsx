import { createFileRoute } from "@tanstack/react-router";
import { Converter } from "@/components/Converter";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Witness Protection for HEICs — Bulk Image Converter" },
      {
        name: "description",
        content:
          "Give your HEICs a new identity. Bulk-convert HEIC, JPG, PNG, WEBP in your browser — no upload, no signup.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="min-h-screen">
      <Converter />
    </main>
  );
}
