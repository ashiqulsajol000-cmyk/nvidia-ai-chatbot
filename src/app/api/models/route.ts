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
      if (data.data) {
        const seen = new Set<string>();
        data.data = data.data.filter((m: { id: string }) => {
          if (seen.has(m.id)) return false;
          seen.add(m.id);
          return true;
        });
      }
      return Response.json(data);
    }

    return Response.json({ object: "list", data: FREE_MODELS });
  } catch {
    return Response.json({ object: "list", data: FREE_MODELS });
  }
}
