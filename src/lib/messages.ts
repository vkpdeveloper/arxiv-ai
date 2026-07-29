import type { BackgroundRequest, BackgroundResponse } from "../types";

export async function sendBackgroundMessage(
  request: BackgroundRequest,
): Promise<BackgroundResponse> {
  try {
    return (await chrome.runtime.sendMessage(request)) as BackgroundResponse;
  } catch (error) {
    return {
      ok: false,
      code: "EXTENSION_ERROR",
      error: error instanceof Error ? error.message : "The extension stopped responding.",
    };
  }
}
