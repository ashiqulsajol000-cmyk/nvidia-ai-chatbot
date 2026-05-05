import { NVIDIA_BASE_URL, getApiKey, FREE_MODELS } from "@/lib/nvidia";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const apiKey = getApiKey();
    const response = await fetch(`${NVIDIA_BASE_URL}/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      return Response.json(data);
    }

    return Response.json({ object: "list", data: FREE_MODELS });
  } catch {
    return Response.json({ object: "list", data: FREE_MODELS });
  }
}
