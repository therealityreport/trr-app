import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import TypographyTab from "@/components/admin/design-system/TypographyTab";

const { fetchAdminWithAuthMock } = vi.hoisted(() => ({
  fetchAdminWithAuthMock: vi.fn(),
}));

const navigationState = vi.hoisted(() => ({
  search: "",
  replace: vi.fn(),
}));

vi.mock("@/lib/admin/client-auth", () => ({
  fetchAdminWithAuth: fetchAdminWithAuthMock,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: navigationState.replace }),
  useSearchParams: () => new URLSearchParams(navigationState.search),
}));

const initialState = {
  sets: [
    {
      id: "set-1",
      slug: "survey-base",
      name: "Survey Base",
      area: "surveys" as const,
      seedSource: "src/lib/surveys/ui-templates.ts",
      roles: {
        option: {
          mobile: {
            fontFamily: "\"Plymouth Serial\", var(--font-sans), sans-serif",
            fontSize: "18px",
            fontWeight: "800",
            lineHeight: "1.2",
            letterSpacing: "0.03em",
          },
          desktop: {
            fontFamily: "\"Plymouth Serial\", var(--font-sans), sans-serif",
            fontSize: "18px",
            fontWeight: "800",
            lineHeight: "1.2",
            letterSpacing: "0.03em",
          },
        },
        body: {
          mobile: {
            fontFamily: "var(--font-hamburg)",
            fontSize: "16px",
            fontWeight: "400",
            lineHeight: "24px",
            letterSpacing: "0px",
          },
          desktop: {
            fontFamily: "var(--font-hamburg)",
            fontSize: "16px",
            fontWeight: "400",
            lineHeight: "24px",
            letterSpacing: "0px",
          },
        },
      },
      createdAt: "",
      updatedAt: "",
    },
    {
      id: "set-2",
      slug: "survey-alt",
      name: "Survey Alt",
      area: "surveys" as const,
      seedSource: "manual",
      roles: {
        heading: {
          mobile: {
            fontFamily: "var(--font-gloucester)",
            fontSize: "20px",
            fontWeight: "700",
            lineHeight: "28px",
            letterSpacing: "0px",
          },
          desktop: {
            fontFamily: "var(--font-gloucester)",
            fontSize: "30px",
            fontWeight: "700",
            lineHeight: "38px",
            letterSpacing: "0px",
          },
        },
      },
      createdAt: "",
      updatedAt: "",
    },
    {
      id: "set-3",
      slug: "admin-base",
      name: "Admin Base",
      area: "admin" as const,
      seedSource: "src/components/admin/AdminGlobalHeader.tsx",
      roles: {
        heading: {
          mobile: {
            fontFamily: "var(--font-hamburg)",
            fontSize: "14px",
            fontWeight: "600",
            lineHeight: "20px",
            letterSpacing: "0px",
          },
          desktop: {
            fontFamily: "var(--font-hamburg)",
            fontSize: "14px",
            fontWeight: "600",
            lineHeight: "20px",
            letterSpacing: "0px",
          },
        },
      },
      createdAt: "",
      updatedAt: "",
    },
    {
      id: "set-4",
      slug: "home-landing",
      name: "Home Landing",
      area: "user-frontend" as const,
      seedSource: "src/app/page.tsx",
      roles: {
        heroTitle: {
          mobile: {
            fontFamily: "var(--font-rude-slab)",
            fontSize: "36px",
            fontWeight: "700",
            lineHeight: "40px",
            letterSpacing: "0px",
          },
          desktop: {
            fontFamily: "var(--font-rude-slab)",
            fontSize: "48px",
            fontWeight: "700",
            lineHeight: "48px",
            letterSpacing: "0px",
          },
        },
      },
      createdAt: "",
      updatedAt: "",
    },
  ],
  assignments: [
    {
      id: "assignment-1",
      area: "surveys" as const,
      pageKey: "single-select",
      instanceKey: "text-multiple-choice",
      setId: "set-1",
      sourcePath: "src/components/survey/SingleSelectInput.tsx",
      notes: null,
      createdAt: "",
      updatedAt: "",
    },
    {
      id: "assignment-2",
      area: "surveys" as const,
      pageKey: "matrix-likert",
      instanceKey: "question",
      setId: "set-2",
      sourcePath: "src/components/survey/MatrixLikertInput.tsx",
      notes: null,
      createdAt: "",
      updatedAt: "",
    },
    {
      id: "assignment-3",
      area: "admin" as const,
      pageKey: "social-week",
      instanceKey: "detail-cards",
      setId: "set-3",
      sourcePath: "src/components/admin/social-week/WeekDetailPageView.tsx",
      notes: null,
      createdAt: "",
      updatedAt: "",
    },
    {
      id: "assignment-4",
      area: "user-frontend" as const,
      pageKey: "home",
      instanceKey: "landing-shell",
      setId: "set-4",
      sourcePath: "src/app/page.tsx",
      notes: null,
      createdAt: "",
      updatedAt: "",
    },
  ],
};

function cloneState() {
  return JSON.parse(JSON.stringify(initialState)) as typeof initialState;
}

function jsonResponse(payload: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(payload), {
      status,
      headers: { "content-type": "application/json" },
    }),
  );
}

describe("TypographyTab", () => {
  beforeEach(() => {
    let state = cloneState();

    fetchAdminWithAuthMock.mockReset();
    navigationState.search = "";
    navigationState.replace.mockReset();
    fetchAdminWithAuthMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === "/api/admin/design-system/typography") {
        return jsonResponse(state);
      }

      if (url === "/api/admin/design-system/typography/assignments" && init?.method === "PUT") {
        const body = JSON.parse(String(init.body)) as {
          area: string;
          pageKey: string | null;
          instanceKey: string | null;
          setId: string;
        };

        state = {
          ...state,
          assignments: state.assignments.map((assignment) =>
            assignment.area === body.area &&
            assignment.pageKey === body.pageKey &&
            assignment.instanceKey === body.instanceKey
              ? { ...assignment, setId: body.setId }
              : assignment,
          ),
        };

        return jsonResponse({
          assignment: state.assignments.find((assignment) =>
            assignment.area === body.area &&
            assignment.pageKey === body.pageKey &&
            assignment.instanceKey === body.instanceKey,
          ),
        });
      }

      if (url === "/api/admin/design-system/typography/sets" && init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as {
          name: string;
          area: "surveys" | "user-frontend" | "admin";
          seedSource: string;
          roles: typeof state.sets[number]["roles"];
        };

        const nextSet = {
          id: `set-${state.sets.length + 1}`,
          slug: body.name.toLowerCase().replace(/\s+/g, "-"),
          name: body.name,
          area: body.area,
          seedSource: body.seedSource,
          roles: body.roles,
          createdAt: "",
          updatedAt: "",
        };

        state = {
          ...state,
          sets: [...state.sets, nextSet],
        };

        return jsonResponse({ set: nextSet }, 201);
      }

      if (url === "/api/admin/design-system/typography/sets/set-1" && init?.method === "PUT") {
        return jsonResponse({ set: state.sets[0] });
      }

      return jsonResponse(state);
    });
  });

  it("renders the simplified set library with friendly labels", async () => {
    render(<TypographyTab />);

    expect(await screen.findByText("Typography Sets")).toBeInTheDocument();
    expect(screen.getByText("Set Library")).toBeInTheDocument();
    expect(screen.getByText("Edit Selected Set")).toBeInTheDocument();
    expect(screen.getByText("Where Sets Are Applied")).toBeInTheDocument();
    expect(screen.getByTestId("typography-summary-rail")).toBeInTheDocument();
    expect(screen.queryByText("Select a set")).not.toBeInTheDocument();
    expect(screen.getAllByText("Single Select").length).toBeGreaterThan(0);
    expect(screen.queryByText("single-select / text-multiple-choice")).not.toBeInTheDocument();
    expect(screen.queryByText(/18px size/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Set name")).toHaveValue("Survey Base");
  });

  it("supports sorting and area filtering in the library", async () => {
    render(<TypographyTab />);

    await screen.findByText("Set Library");

    const setButtons = () =>
      screen
        .getAllByRole("button", { name: /^Select / })
        .map((button) => button.getAttribute("aria-label"));

    expect(setButtons()).toEqual([
      "Select Admin Base",
      "Select Home Landing",
      "Select Survey Alt",
      "Select Survey Base",
    ]);

    fireEvent.change(screen.getByLabelText("Sort by"), { target: { value: "heading-font" } });
    expect(setButtons()).toEqual([
      "Select Survey Alt",
      "Select Admin Base",
      "Select Survey Base",
      "Select Home Landing",
    ]);

    fireEvent.change(screen.getByLabelText("Area filter"), { target: { value: "admin" } });
    expect(setButtons()).toEqual(["Select Admin Base"]);

    fireEvent.change(screen.getByLabelText("Area filter"), { target: { value: "other" } });
    expect(screen.getByText("No typography sets match this filter.")).toBeInTheDocument();
  });

  it("opens usage previews and role popovers from the set library", async () => {
    render(<TypographyTab />);

    await screen.findByText("Set Library");

    fireEvent.click(screen.getAllByRole("button", { name: "Single Select" })[0]!);
    const modal = await screen.findByTestId("usage-preview-modal");
    expect(modal).toBeInTheDocument();
    expect(within(modal).getByRole("heading", { name: "Single Select" })).toBeInTheDocument();
    expect(within(modal).getByText("Choose the one answer that best matches your take.")).toBeInTheDocument();
    expect(within(modal).getByRole("link", { name: "Open actual page" })).toHaveAttribute("href", "/surveys/rhoslc-s6/play");
    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    fireEvent.focus(screen.getByTestId("set-role-row-set-1-option"));
    const popover = await screen.findByTestId("role-preview-popover-set-1-option");
    expect(popover).toBeInTheDocument();
    expect(within(popover).getByText("This shows how the option text is written on the page.")).toBeInTheDocument();
    expect(within(popover).getAllByText("Meredith").length).toBeGreaterThan(0);
  });

  it("updates set usage pills when an assignment changes", async () => {
    render(<TypographyTab />);

    expect(await screen.findByText("Where Sets Are Applied")).toBeInTheDocument();

    const assignmentSelect = screen.getByTestId("assignment-select-assignment-1");
    expect(assignmentSelect.className).toContain("w-full");

    fireEvent.change(assignmentSelect, { target: { value: "set-2" } });

    await waitFor(() => {
      expect(screen.getByText("Assignment updated.")).toBeInTheDocument();
    });

    const altCard = screen.getByRole("button", { name: "Select Survey Alt" }).closest("article");
    expect(altCard).not.toBeNull();
    expect(within(altCard!).getAllByText("Single Select").length).toBeGreaterThan(0);
  });

  it("keeps a single active preview in the editor and allows creating a new set draft", async () => {
    render(<TypographyTab />);

    await screen.findByText("Edit Selected Set");
    fireEvent.click(screen.getByRole("button", { name: "Mobile" }));

    expect(screen.getByText("Live Preview Context")).toBeInTheDocument();
    expect(screen.getByTestId("editor-sticky-actions")).toBeInTheDocument();
    expect(screen.queryByText("The Reality Report typography preview")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "New Set" }));

    const nameInput = screen.getByLabelText("Set name");
    fireEvent.change(nameInput, { target: { value: "Fresh Set" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Set" }));

    await waitFor(() => {
      expect(fetchAdminWithAuthMock).toHaveBeenCalledWith(
        "/api/admin/design-system/typography/sets",
        expect.objectContaining({ method: "POST" }),
        expect.anything(),
      );
    });
  });
});
