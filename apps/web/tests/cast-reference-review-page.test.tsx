import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import CastReferenceReviewPageClient from "@/app/admin/cast-reference-review/CastReferenceReviewPageClient";

const mocks = vi.hoisted(() => ({
  fetchAdminWithAuth: vi.fn(),
  guardState: {
    checking: false,
    hasAccess: true,
    user: { uid: "admin-test-user" },
  },
}));

vi.mock("@/lib/admin/client-auth", () => ({
  fetchAdminWithAuth: (...args: unknown[]) =>
    (mocks.fetchAdminWithAuth as (...inner: unknown[]) => unknown)(...args),
}));

vi.mock("@/lib/admin/useAdminGuard", () => ({
  useAdminGuard: () => mocks.guardState,
}));

vi.mock("@/components/admin/AdminGlobalHeader", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/admin/AdminBreadcrumbs", () => ({
  __esModule: true,
  default: () => <div data-testid="breadcrumbs" />,
}));

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const pendingQueuePayload = {
  items: [
    {
      id: "11111111-1111-1111-1111-111111111111",
      person_id: "person-1",
      person_name: "Person One",
      review_status: "pending_review",
      review_notes: {
        builder_review_reason: "multiple_faces_requires_human_selection",
      },
      embedding_status: "pending",
      source_url: "https://example.com/source.jpg",
      hosted_url: "https://cdn.example.com/source.jpg",
      metadata: {
        cast_reference_builder: {
          contract_key: "insightface:antelopev2:faceanalysis:normed_embedding:512d:l2_unit",
          image_width: 200,
          image_height: 100,
          raw_face_count: 2,
          candidate_faces: [
            {
              face_index: 0,
              bbox: [10, 10, 60, 70],
              det_score: 0.91,
              blur_score: 210,
              passed: true,
            },
            {
              face_index: 1,
              bbox: [120, 12, 180, 78],
              det_score: 0.94,
              blur_score: 230,
              passed: true,
            },
          ],
        },
      },
    },
  ],
};

describe("CastReferenceReviewPageClient", () => {
  beforeEach(() => {
    mocks.fetchAdminWithAuth.mockReset();
    mocks.guardState.checking = false;
    mocks.guardState.hasAccess = true;
    mocks.guardState.user = { uid: "admin-test-user" };
    mocks.fetchAdminWithAuth.mockImplementation((input: unknown) => {
      const url = String(input);
      if (url.includes("/review-queue")) {
        return Promise.resolve(jsonResponse(pendingQueuePayload));
      }
      if (url.endsWith("/review")) {
        return Promise.resolve(jsonResponse({ id: "11111111-1111-1111-1111-111111111111", review_status: "approved" }));
      }
      if (url.endsWith("/reembed")) {
        return Promise.resolve(jsonResponse({ embedding_status: "ready" }));
      }
      return Promise.resolve(jsonResponse({}));
    });
  });

  it("lets an admin choose the correct gallery face and rebuild the reference", async () => {
    render(<CastReferenceReviewPageClient />);

    expect(await screen.findAllByText("Person One")).toHaveLength(2);
    expect(screen.getAllByText("multiple faces requires human selection")).toHaveLength(2);
    expect(screen.getByText("Face 1")).toBeInTheDocument();
    expect(screen.getByText("Face 2")).toBeInTheDocument();

    const approveButton = screen.getByRole("button", { name: "Approve selected face" });
    expect(approveButton).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Select Face 2" }));
    expect(approveButton).not.toBeDisabled();

    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(mocks.fetchAdminWithAuth).toHaveBeenCalledWith(
        "/api/admin/trr-api/face-references/11111111-1111-1111-1111-111111111111/reembed",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ selected_face_index: 1 }),
        }),
      );
    });
    expect(mocks.fetchAdminWithAuth).toHaveBeenCalledWith(
      "/api/admin/trr-api/face-references/11111111-1111-1111-1111-111111111111/review",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          review_status: "approved",
          review_notes: {
            decision: "selected_gallery_face",
            selected_face_index: 1,
          },
        }),
      }),
    );
  });
});
