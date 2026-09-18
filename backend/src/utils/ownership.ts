export function isOwnedBy(resourceUserId: string, requestingUserId: string) {
  return resourceUserId === requestingUserId;
}
