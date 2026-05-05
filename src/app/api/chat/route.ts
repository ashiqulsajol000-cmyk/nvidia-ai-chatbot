import { NVIDIA_BASE_URL, getApiKey } from "@/lib/nvidia";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { messages, model, temperature = 0.7, max_tokens = 1024, apiKey: customKey } = body;

    if (!messages || !model) {
      return Response.json(
        { error: "Missing required fields: messages, model" },
        { status: 400 }
      );
    }

    const apiKey = getApiKey(customKey);

    const response = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return Response.json(
        { error: `NVIDIA API error: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith("data: ")) continue;
              const data = trimmed.slice(6);
              if (data === "[DONE]") {
                controller.enqueue(
                  new TextEncoder().encode("data: [DONE]\n\n")
                );
                continue;
              }
              try {
                JSON.parse(data);
                controller.enqueue(
                  new TextEncoder().encode(`data: ${data}\n\n`)
                );
              } catch {
                // skip malformed chunks
              }
            }
          }
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Stream processing error";
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({ error: message })}\n\n`
            )
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
