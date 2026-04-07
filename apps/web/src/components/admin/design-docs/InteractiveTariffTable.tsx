"use client";

const FONT = '"nyt-franklin", helvetica, arial, sans-serif';

export type TariffStatus =
  | "retaliated"
  | "possible-retaliation"
  | "no-retaliation"
  | "trying-to-negotiate"
  | "offered-concessions";

type TariffCountryRow = {
  status: TariffStatus;
  country: string;
  tariff: string;
  exports: string;
  note: string;
  hasAsterisk?: boolean;
};

const STATUS_CONFIG: Record<
  TariffStatus,
  { lines: string[]; bg: string; color: string; border?: string }
> = {
  retaliated: {
    lines: ["Retaliated"],
    bg: "#B86200",
    color: "#FFFFFF",
  },
  "possible-retaliation": {
    lines: ["Possible", "retaliation"],
    bg: "#B86200",
    color: "#FFFFFF",
  },
  "no-retaliation": {
    lines: ["No retaliation"],
    bg: "#FFFFFF",
    color: "#666666",
    border: "1px solid #D3D3D3",
  },
  "trying-to-negotiate": {
    lines: ["Trying to", "negotiate"],
    bg: "#4E9493",
    color: "#FFFFFF",
  },
  "offered-concessions": {
    lines: ["Offered", "concessions"],
    bg: "#4E9493",
    color: "#FFFFFF",
  },
};

const TARIFF_COUNTRIES_DATA: TariffCountryRow[] = [
  {
    status: "possible-retaliation",
    country: "European Union",
    tariff: "+20%",
    exports: "$606 bil.",
    note: "Preparing to retaliate with wide-ranging levies this week, even as officials also offer concessions and seek to negotiate.",
  },
  {
    status: "no-retaliation",
    country: "Mexico",
    tariff: "+25%",
    exports: "$506 bil.",
    note: "Faces 25 percent tariffs on some imports, but was exempted from the latest round.",
    hasAsterisk: true,
  },
  {
    status: "retaliated",
    country: "China",
    tariff: "+34%",
    exports: "$439 bil.",
    note: "Matched new tariffs by levying an extra 34 percent duty on U.S. imports.",
  },
  {
    status: "retaliated",
    country: "Canada",
    tariff: "+25%",
    exports: "$413 bil.",
    note: "Imposed retaliatory tariffs against a number of U.S. goods as it faces duties on some Canadian goods.",
    hasAsterisk: true,
  },
  {
    status: "trying-to-negotiate",
    country: "Japan",
    tariff: "+24%",
    exports: "$148 bil.",
    note: "Has few options to retaliate, and depends on U.S. military commitments.",
  },
  {
    status: "offered-concessions",
    country: "Vietnam",
    tariff: "+46%",
    exports: "$137 bil.",
    note: "Offered to reduce tariffs on U.S. imports to zero.",
  },
  {
    status: "trying-to-negotiate",
    country: "South Korea",
    tariff: "+26%",
    exports: "$132 bil.",
    note: "Sending its trade minister to Washington for talks.",
  },
  {
    status: "offered-concessions",
    country: "Taiwan",
    tariff: "+32%",
    exports: "$116 bil.",
    note: "Offering zero tariffs as a starting point for discussion.",
  },
  {
    status: "offered-concessions",
    country: "India",
    tariff: "+27%",
    exports: "$87 bil.",
    note: "Approved a few concessions in March, like reducing tariffs on bourbon, but has since been relatively silent.",
  },
  {
    status: "trying-to-negotiate",
    country: "United Kingdom",
    tariff: "+10%",
    exports: "$68 bil.",
    note: "Seeking discussions, while drawing up a list of U.S. products it could potentially hit with retaliatory tariffs.",
  },
  {
    status: "trying-to-negotiate",
    country: "Switzerland",
    tariff: "+32%",
    exports: "$63 bil.",
    note: "“Switzerland cannot comprehend” the tariff calculations, its president said — but officials say they will not retaliate.",
  },
  {
    status: "offered-concessions",
    country: "Thailand",
    tariff: "+37%",
    exports: "$63 bil.",
    note: "Offered to increase imports of energy, aircraft and farm products from the United States",
  },
  {
    status: "trying-to-negotiate",
    country: "Malaysia",
    tariff: "+24%",
    exports: "$53 bil.",
    note: "Seeking engagement with the United States, while calling on Asian nations to organize a collective response.",
  },
  {
    status: "trying-to-negotiate",
    country: "Singapore",
    tariff: "+10%",
    exports: "$43 bil.",
    note: "Officials said they would try to understand U.S. areas of concern.",
  },
  {
    status: "trying-to-negotiate",
    country: "Brazil",
    tariff: "+10%",
    exports: "$42 bil.",
    note: "Brazil’s president said that the country would try to reach an agreement but that it is preparing possible retaliatory measures.",
  },
  {
    status: "offered-concessions",
    country: "Indonesia",
    tariff: "+32%",
    exports: "$28 bil.",
    note: "Offered to buy more U.S. products such as cotton, wheat, oil and gas.",
  },
  {
    status: "offered-concessions",
    country: "Israel",
    tariff: "+17%",
    exports: "$22 bil.",
    note: "Israel had sought to avert the higher rate by voiding duties on American products — seemingly to no avail.",
  },
  {
    status: "trying-to-negotiate",
    country: "Colombia",
    tariff: "+10%",
    exports: "$18 bil.",
    note: "Colombia’s president said he would respond to tariffs only if they harm job creation in the country.",
  },
  {
    status: "trying-to-negotiate",
    country: "Turkey",
    tariff: "+10%",
    exports: "$17 bil.",
    note: "The trade minister said his country hoped to get the additional tariff lifted.",
  },
  {
    status: "trying-to-negotiate",
    country: "Australia",
    tariff: "+10%",
    exports: "$17 bil.",
    note: "The tariffs have “no basis in logic,” the prime minister said. But he said Australia would not retaliate.",
  },
];

const COLUMN_WIDTHS = {
  status: 112,
  country: 118,
  tariff: 74,
  exports: 78,
} as const;

function StatusBadge({ status }: { status: TariffStatus }) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 0,
        padding: status === "no-retaliation" ? "2px 6px 1px" : "3px 7px 2px",
        borderRadius: 2,
        border: config.border ?? "none",
        background: config.bg,
        color: config.color,
        fontFamily: FONT,
        fontSize: 16,
        fontWeight: 700,
        lineHeight: "16px",
        letterSpacing: "normal",
        textTransform: "none",
        whiteSpace: "nowrap",
      }}
    >
      {config.lines.map((line) => (
        <span key={line}>{line}</span>
      ))}
    </span>
  );
}

function TariffValue({
  value,
  hasAsterisk = false,
}: {
  value: string;
  hasAsterisk?: boolean;
}) {
  return (
    <>
      {value}
      {hasAsterisk ? (
        <span
          aria-hidden="true"
          style={{
            display: "inline-block",
            marginLeft: 1,
            fontSize: 11,
            lineHeight: "12px",
            verticalAlign: "top",
          }}
        >
          *
        </span>
      ) : null}
    </>
  );
}

export default function InteractiveTariffTable({
  source: _source,
  noteText,
}: {
  source: string;
  noteText: string;
}) {
  void _source;

  return (
    <div style={{ maxWidth: 600 }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          tableLayout: "fixed",
          fontFamily: FONT,
        }}
      >
        <thead>
          <tr
            style={{
              display: "flex",
              gap: 12,
              alignItems: "flex-end",
              borderBottom: "1px solid #121212",
            }}
          >
            <th
              style={{
                width: COLUMN_WIDTHS.status,
                padding: "0 0 9px",
                fontSize: 11,
                fontWeight: 400,
                lineHeight: "11px",
                color: "#999999",
                textAlign: "left",
                textTransform: "uppercase",
              }}
            >
              Status
            </th>
            <th
              style={{
                width: COLUMN_WIDTHS.country,
                padding: "0 0 9px",
                fontSize: 11,
                fontWeight: 400,
                lineHeight: "11px",
                color: "#999999",
                textAlign: "left",
                textTransform: "uppercase",
              }}
            >
              Trading
              <br />
              partner
            </th>
            <th
              style={{
                width: COLUMN_WIDTHS.tariff,
                padding: "0 0 9px",
                fontSize: 11,
                fontWeight: 400,
                lineHeight: "11px",
                color: "#999999",
                textAlign: "left",
                textTransform: "uppercase",
              }}
            >
              New
              <br />
              tariff
            </th>
            <th
              style={{
                width: COLUMN_WIDTHS.exports,
                padding: "0 0 9px",
                fontSize: 11,
                fontWeight: 400,
                lineHeight: "11px",
                color: "#999999",
                textAlign: "left",
                textTransform: "uppercase",
              }}
            >
              Exports
              <br />
              to U.S.
            </th>
            <th
              style={{
                flex: 1,
                minWidth: 0,
                padding: "0 0 9px",
                fontSize: 11,
                fontWeight: 400,
                lineHeight: "11px",
                color: "#999999",
                textAlign: "left",
                textTransform: "uppercase",
              }}
            >
              Note
            </th>
          </tr>
        </thead>
        <tbody>
          {TARIFF_COUNTRIES_DATA.map((row) => (
            <tr
              key={row.country}
              style={{
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
                borderBottom: "1px solid #E8E8E8",
              }}
            >
              <td
                style={{
                  width: COLUMN_WIDTHS.status,
                  padding: "10px 0",
                  verticalAlign: "top",
                }}
              >
                <StatusBadge status={row.status} />
              </td>
              <td
                style={{
                  width: COLUMN_WIDTHS.country,
                  padding: "10px 0",
                  verticalAlign: "top",
                  fontSize: 16,
                  fontWeight: 700,
                  lineHeight: "16px",
                  color: "#363636",
                }}
              >
                {row.country}
              </td>
              <td
                style={{
                  width: COLUMN_WIDTHS.tariff,
                  padding: "10px 0",
                  verticalAlign: "top",
                  fontSize: 16,
                  fontWeight: 400,
                  lineHeight: "16px",
                  color: "#363636",
                  fontVariantNumeric: "tabular-nums",
                  whiteSpace: "nowrap",
                }}
              >
                <TariffValue value={row.tariff} hasAsterisk={row.hasAsterisk} />
              </td>
              <td
                style={{
                  width: COLUMN_WIDTHS.exports,
                  padding: "10px 0",
                  verticalAlign: "top",
                  fontSize: 16,
                  fontWeight: 400,
                  lineHeight: "16px",
                  color: "#363636",
                  fontVariantNumeric: "tabular-nums",
                  whiteSpace: "nowrap",
                }}
              >
                {row.exports}
              </td>
              <td
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: "10px 0",
                  verticalAlign: "top",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: 16,
                    fontWeight: 400,
                    lineHeight: "16px",
                    color: "#787878",
                  }}
                >
                  {row.note}
                </p>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p
        style={{
          margin: "14px 0 0",
          fontFamily: FONT,
          fontSize: 13,
          fontWeight: 500,
          lineHeight: "17px",
          color: "#727272",
        }}
      >
        Note: {noteText}
      </p>
    </div>
  );
}
