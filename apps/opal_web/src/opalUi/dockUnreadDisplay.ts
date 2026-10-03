/**
 * Dock / chats unread badge display formatting.
 * Source count is dockUnreadCount (server unread sum); "9+" is display only.
 */
export function formatUnread(count: number): string {
  if (count > 9) return "9+";
  return String(count);
}
