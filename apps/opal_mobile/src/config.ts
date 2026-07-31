/** Local development endpoints and synthetic fixture IDs. */
export const API_HTTP_URL = process.env.EXPO_PUBLIC_OPAL_HTTP_URL ?? "http://127.0.0.1:4000";
export const API_WS_URL = process.env.EXPO_PUBLIC_OPAL_WS_URL ?? "ws://127.0.0.1:4000/socket";

export const SYNTHETIC = {
  alexUserId: "a1111111-1111-4111-8111-111111111111",
  jordanUserId: "a2222222-2222-4222-8222-222222222222",
  alexJordanConversationId: "b1111111-1111-4111-8111-111111111111",
  alexGrantedConsentId: "c1111111-1111-4111-8111-111111111111",
} as const;
