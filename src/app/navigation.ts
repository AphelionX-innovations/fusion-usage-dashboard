import { BrainCircuitIcon, HistoryIcon, LayoutDashboardIcon, UsersIcon, WorkflowIcon } from "lucide-react";
import type { DashboardTab } from "./useDashboardParams";

export const NAV: { value: DashboardTab; label: string; icon: typeof LayoutDashboardIcon }[] = [
  { value: "overview", label: "Vue d’ensemble", icon: LayoutDashboardIcon },
  { value: "features", label: "Workflows et agents", icon: WorkflowIcon },
  { value: "insights", label: "Modèles et évaluations", icon: BrainCircuitIcon },
  { value: "activity", label: "Activité", icon: HistoryIcon },
  { value: "users", label: "Utilisateurs", icon: UsersIcon },
];

export const PAGE_COPY: Record<DashboardTab, { eyebrow: string; title: string }> = {
  overview: {
    eyebrow: "Super-admin · usage des traces",
    title: "Qui utilise la plateforme, et comment ça évolue",
  },
  features: {
    eyebrow: "Workflows et agents",
    title: "Comment la plateforme est utilisée",
  },
  insights: {
    eyebrow: "Modèles, prompts et évaluations",
    title: "Ce que consomment les utilisateurs, et à quel coût",
  },
  activity: {
    eyebrow: "Journal d’audit",
    title: "Ce qui a été créé, modifié ou supprimé",
  },
  users: {
    eyebrow: "Comptes et projets",
    title: "Utilisateurs et projets",
  },
};
