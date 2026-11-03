import { getFullSyncData } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let lastHash = "";
      let closed = false;
      let inFlight = false;

      const sendUpdate = async () => {
        if (closed || inFlight) return;
        inFlight = true;
        try {
          const data = await getFullSyncData();
          const hash = `${data.state.updated_at}-${data.participants.length}`;
          if (hash !== lastHash) {
            lastHash = hash;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
            );
          }
        } catch {
          // ignore transient read errors
        } finally {
          inFlight = false;
        }
      };

      // Initial push immediately
      void sendUpdate();

      const interval = setInterval(() => {
        void sendUpdate();
      }, 800);

      request.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          // already closed
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

