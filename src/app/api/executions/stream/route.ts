import { executionEventBus, type ExecutionEvent } from "@/lib/execution-events";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const listener = (event: ExecutionEvent) => {
        try {
          const data = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(data));
        } catch {
          // Controller might be closed
        }
      };

      executionEventBus.subscribe(listener);
      controller.enqueue(encoder.encode(": connected\n\n"));

      // Keep-alive comment every 15 seconds
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          clearInterval(keepAlive);
        }
      }, 15_000);

      // Clean up on abort signal
      req.signal.addEventListener("abort", () => {
        clearInterval(keepAlive);
        executionEventBus.unsubscribe(listener);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
