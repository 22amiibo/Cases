import { ProgressHistory } from "@/components/progress/ProgressHistory";
import { progressCatalog } from "@/components/progress/catalog";
export default function HistoryPage() {
  return <ProgressHistory resources={progressCatalog().resources} />;
}
