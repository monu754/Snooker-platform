export function shouldNotifyFavoriteUsersOnStatusChange(previousStatus: string | undefined, nextStatus: string | undefined) {
  return nextStatus === "live" && previousStatus !== "live";
}
