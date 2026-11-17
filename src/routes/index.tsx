import { createFileRoute } from "@tanstack/react-router";
import { WeddingPage } from "@/components/wedding-page";

export const Route = createFileRoute("/")({
  component: WeddingPage,
});
