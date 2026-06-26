"use client";
import { useRequireApproved } from "@/lib/auth";
import Workspace from "@/components/Workspace";

export default function WorkspacePage() {
  useRequireApproved();
  return <Workspace />;
}
