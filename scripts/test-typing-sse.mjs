/**
 * Simulates two clients: one SSE listener (Alpha 1) and one typer (Delta 1).
 * Run while dev server is up: node scripts/test-typing-sse.mjs
 */

const BASE = process.env.BASE_URL || "http://localhost:3000";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function postTyping(user, typing) {
  const res = await fetch(`${BASE}/api/typing`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user, typing }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`POST failed: ${JSON.stringify(body)}`);
  return body;
}

async function listenForTypingEvents(timeoutMs = 8000) {
  const events = [];
  const controller = new AbortController();

  const res = await fetch(`${BASE}/api/realtime?user=alpha%201`, {
    signal: controller.signal,
    headers: { Accept: "text/event-stream" },
  });

  if (!res.ok || !res.body) {
    throw new Error(`SSE connect failed: ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const readLoop = (async () => {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let boundary;
      while ((boundary = buffer.indexOf("\n\n")) !== -1) {
        const chunk = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);

        let event = "message";
        let data = "";
        for (const line of chunk.split("\n")) {
          if (line.startsWith("event: ")) event = line.slice(7);
          if (line.startsWith("data: ")) data = line.slice(6);
        }

        if (event === "typing") {
          events.push(JSON.parse(data));
          console.log("  [SSE received]", event, data);
        }
      }
    }
  })();

  await sleep(500);

  console.log("→ Delta 1 starts typing...");
  await postTyping("delta 1", true);

  await sleep(1500);

  console.log("→ Delta 1 stops typing...");
  await postTyping("delta 1", false);

  await sleep(1500);

  controller.abort();
  try {
    await readLoop;
  } catch {
    // expected on abort
  }

  return events;
}

async function main() {
  console.log(`Testing typing SSE at ${BASE}\n`);

  const events = await listenForTypingEvents();

  const gotStart = events.some((e) => e.user === "delta 1" && e.typing === true);
  const gotStop = events.some((e) => e.user === "delta 1" && e.typing === false);

  console.log("\n--- Results ---");
  console.log(`typing:true received:  ${gotStart ? "PASS" : "FAIL"}`);
  console.log(`typing:false received: ${gotStop ? "PASS" : "FAIL"}`);
  console.log(`Total typing events:   ${events.length}`);

  if (!gotStart || !gotStop) {
    process.exit(1);
  }

  console.log("\nTyping indicator pipeline works end-to-end.");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
