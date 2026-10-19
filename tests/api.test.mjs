import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ApiError,
  apiRequest,
  getOpenAssignments,
  login,
  logout,
  submitAssignment,
  skipAssignment,
  replaceAssignment,
} from "../src/api.ts";

async function withFetch(implementation, check) {
  const original = globalThis.fetch;
  globalThis.fetch = implementation;
  try {
    await check();
  } finally {
    globalThis.fetch = original;
  }
}
const json = (value) =>
  new Response(JSON.stringify(value), {
    headers: { "Content-Type": "application/json" },
  });

test("login normalizes email, preserves passwords, and does not send cookie credentials", async () => {
  const session = {
    token: "a".repeat(43),
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    user: { id: "user", displayName: "Alice" },
  };
  await withFetch(
    async (path, options) => {
      assert.equal(path, "/api/auth/login");
      assert.equal(options.method, "POST");
      assert.equal(options.credentials, "omit");
      assert.equal(options.cache, "no-store");
      assert.equal(options.redirect, "error");
      assert.deepEqual(JSON.parse(options.body), {
        email: "alice@example.test",
        password: " unchanged password ",
      });
      assert.ok(!options.headers.Authorization);
      return json(session);
    },
    async () =>
      assert.deepEqual(
        await login(" Alice@Example.test ", " unchanged password "),
        session,
      ),
  );
});
test("private requests use bearer headers and the selected company scope", async () => {
  await withFetch(
    async (path, options) => {
      assert.equal(path, "/api/organizations/company-id/assignments/my-open");
      assert.equal(options.headers.Authorization, "Bearer private-token");
      assert.equal(options.body, undefined);
      return json([]);
    },
    async () =>
      assert.deepEqual(
        await getOpenAssignments("private-token", "company-id"),
        [],
      ),
  );
});
test("submission preserves exact assigned IDs and explicit unobserved answers", async () => {
  const answers = [
    { questionVersionId: "server-question-2", rating: null },
    { questionVersionId: "server-question-1", rating: 4 },
  ];
  await withFetch(
    async (path, options) => {
      assert.equal(
        path,
        "/api/organizations/org/assignments/assignment/submit",
      );
      assert.equal(options.method, "POST");
      assert.deepEqual(JSON.parse(options.body), { answers });
      return json({ ok: true, participationPercentage: 100 });
    },
    async () =>
      assert.equal(
        (await submitAssignment("token", "org", "assignment", answers))
          .participationPercentage,
        100,
      ),
  );
});
test("skip, replacement and logout send only their intended empty action bodies", async () => {
  const paths = [];
  await withFetch(
    async (path, options) => {
      paths.push(path);
      assert.equal(options.method, "POST");
      if (path !== "/api/auth/logout")
        assert.deepEqual(JSON.parse(options.body), {});
      return json({ ok: true });
    },
    async () => {
      await skipAssignment("token", "org", "assignment");
      await replaceAssignment("token", "org", "assignment");
      await logout("token");
    },
  );
  assert.deepEqual(paths, [
    "/api/organizations/org/assignments/assignment/skip",
    "/api/organizations/org/assignments/assignment/replace",
    "/api/auth/logout",
  ]);
});
test("authorization and conflict errors do not expose server diagnostics", async () => {
  for (const status of [401, 403, 404, 409, 429, 500])
    await withFetch(
      async () => new Response("private server diagnostics", { status }),
      async () => {
        await assert.rejects(
          apiRequest("/me", { token: "token" }),
          (error) =>
            error instanceof ApiError &&
            error.status === status &&
            !error.message.includes("private server diagnostics"),
        );
      },
    );
});
test("network failures are not automatically retried after mutations", async () => {
  let calls = 0;
  await withFetch(
    async () => {
      calls++;
      throw new TypeError("Connection lost");
    },
    async () => {
      await assert.rejects(
        submitAssignment("token", "org", "assignment", []),
        (error) => error instanceof ApiError && error.status === 0,
      );
    },
  );
  assert.equal(calls, 1);
});
test("HTML proxy fallback, invalid JSON and incomplete sessions are rejected", async () => {
  for (const response of [
    () =>
      new Response("<html>frontend fallback</html>", {
        headers: { "Content-Type": "text/html" },
      }),
    () =>
      new Response("not-json", {
        headers: { "Content-Type": "application/json" },
      }),
    () => json({ token: "invalid" }),
  ])
    await withFetch(
      async () => response(),
      async () => {
        await assert.rejects(
          login("alice@example.test", "password"),
          (error) => error instanceof ApiError && error.status === 502,
        );
      },
    );
});
test("caller cancellation is preserved so obsolete company requests can be ignored", async () => {
  const controller = new AbortController();
  controller.abort();
  await withFetch(
    async () => {
      throw new DOMException("Aborted", "AbortError");
    },
    async () => {
      await assert.rejects(
        getOpenAssignments("token", "org", controller.signal),
        (error) => error.name === "AbortError" && !(error instanceof ApiError),
      );
    },
  );
});
