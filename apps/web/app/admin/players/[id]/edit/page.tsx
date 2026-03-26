"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PlayerForm } from "../../player-form";

export default function EditPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const playerId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    country: "",
    rank: "",
    bio: "",
  });

  useEffect(() => {
    fetch(`/api/admin/players/${playerId}`, { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || "Failed to load player");
        }

        setFormData({
          name: data.player?.name || "",
          country: data.player?.country || "",
          rank: data.player?.rank ? String(data.player.rank) : "",
          bio: data.player?.bio || "",
        });
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load player"))
      .finally(() => setLoading(false));
  }, [playerId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/api/admin/players/${playerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          rank: formData.rank ? Number(formData.rank) : undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to update player");
      }

      setSuccess("Player updated successfully.");
      setTimeout(() => {
        router.push("/admin/players");
        router.refresh();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update player");
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-zinc-400">Loading player profile...</div>;
  }

  return (
    <PlayerForm
      title="Edit Player"
      description="Keep the player directory complete so match scheduling, analytics, favorites, and player discovery all stay aligned."
      backHref="/admin/players"
      backLabel="Back to Player Manager"
      submitLabel="Save Changes"
      savingLabel="Saving..."
      loading={saving}
      error={error}
      success={success}
      formData={formData}
      onChange={(field, value) => setFormData((prev) => ({ ...prev, [field]: value }))}
      onSubmit={handleSubmit}
    />
  );
}
