"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlayerForm } from "../player-form";

export default function CreatePlayerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    country: "",
    rank: "",
    bio: "",
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/admin/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          rank: formData.rank ? Number(formData.rank) : undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to create player");
      }

      setSuccess("Player created successfully.");
      setTimeout(() => {
        router.push("/admin/players");
        router.refresh();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create player");
      setLoading(false);
    }
  };

  return (
    <PlayerForm
      title="Create Player"
      description="Register a player once in the platform, then use that profile everywhere else including match scheduling and discovery."
      backHref="/admin/players"
      backLabel="Back to Player Manager"
      submitLabel="Create Player"
      savingLabel="Creating..."
      loading={loading}
      error={error}
      success={success}
      formData={formData}
      onChange={(field, value) => setFormData((prev) => ({ ...prev, [field]: value }))}
      onSubmit={handleSubmit}
    />
  );
}
