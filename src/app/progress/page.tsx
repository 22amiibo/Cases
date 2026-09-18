import { ProgressDashboard } from "@/components/progress/ProgressDashboard";
import { progressCatalog } from "@/components/progress/catalog";
export default function ProgressPage() {
  return <ProgressDashboard {...progressCatalog()} />;
}
