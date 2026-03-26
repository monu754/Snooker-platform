import User from "./models/User";

type UmpireSummary = {
  _id: { toString(): string } | string;
  email?: string;
  name?: string;
  role?: string;
};

export async function findAssignedUmpire(umpireId: string) {
  const normalizedId = umpireId.trim();
  if (!normalizedId) {
    return null;
  }

  const umpire = await User.findById(normalizedId).select("name email role").lean<UmpireSummary | null>();
  if (!umpire || umpire.role !== "umpire") {
    return null;
  }

  return umpire;
}
