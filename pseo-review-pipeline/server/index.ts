import {
  getState,
  next,
  propose,
  markReviewed,
  type Proposal,
} from "./state";

const PORT = 19600;
const ALLOWED_ORIGINS = ["http://127.0.0.1:4000"];

function corsHeaders(origin?: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
  // Allow any chrome-extension origin, or the Jekyll dev server
  if (origin && (origin.startsWith("chrome-extension://") || ALLOWED_ORIGINS.includes(origin))) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

function json(data: unknown, status = 200, origin?: string | null): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const origin = req.headers.get("Origin");

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    // GET /health
    if (url.pathname === "/health" && req.method === "GET") {
      const state = getState();
      const pending = state.queue.filter((q) => q.status === "pending").length;
      const reviewed = state.queue.filter((q) => q.status === "reviewed").length;
      return json(
        {
          status: state.status,
          queue_length: pending,
          reviewed_count: reviewed,
          current_page: state.current,
        },
        200,
        origin
      );
    }

    // GET /current
    if (url.pathname === "/current" && req.method === "GET") {
      const state = getState();
      if (!state.current) {
        return json({ error: "No current page" }, 404, origin);
      }
      const proposal = state.proposals.get(state.current);
      if (!proposal) {
        return json({ error: "No proposal for current page" }, 404, origin);
      }
      return json(proposal, 200, origin);
    }

    // POST /propose
    if (url.pathname === "/propose" && req.method === "POST") {
      const body = (await req.json()) as Proposal;
      propose(body);
      return json({ ok: true }, 200, origin);
    }

    // POST /decide
    if (url.pathname === "/decide" && req.method === "POST") {
      const body = (await req.json()) as {
        decision: "approve" | "revise" | "skip";
        feedback?: string;
      };
      const state = getState();

      if (!state.current) {
        return json({ error: "No current page" }, 400, origin);
      }

      const proposal = state.proposals.get(state.current);

      if (body.decision === "approve") {
        markReviewed(state.current);
        const approvedProposal = proposal ?? null;
        next();
        return json({ ok: true, proposal: approvedProposal }, 200, origin);
      }

      if (body.decision === "skip") {
        markReviewed(state.current);
        next();
        return json({ ok: true }, 200, origin);
      }

      if (body.decision === "revise") {
        // Store feedback in the proposal and reset to researching
        if (proposal && body.feedback) {
          (proposal as Proposal & { feedback?: string }).feedback = body.feedback;
        }
        state.status = "researching";
        return json({ ok: true }, 200, origin);
      }

      return json({ error: "Invalid decision" }, 400, origin);
    }

    // GET /queue
    if (url.pathname === "/queue" && req.method === "GET") {
      const state = getState();
      return json(
        state.queue.map((q) => ({ path: q.path, status: q.status })),
        200,
        origin
      );
    }

    // POST /next
    if (url.pathname === "/next" && req.method === "POST") {
      const page = next();
      const state = getState();
      return json(
        { ok: true, current: page, status: state.status },
        200,
        origin
      );
    }

    return json({ error: "Not found" }, 404, origin);
  },
});

console.error(`pseo-review server listening on http://127.0.0.1:${PORT}`);
