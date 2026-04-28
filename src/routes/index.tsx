import { createFileRoute } from "@tanstack/react-router";
import { Converter } from "@/components/Converter";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bulk Image Converter — HEIC, JPG, PNG, WEBP" },
      {
        name: "description",
        content:
          "Convert images in bulk between HEIC, JPG, PNG and WEBP. Fast, private, runs entirely in your browser.",
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
