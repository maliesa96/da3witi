import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage({
  params,
}: {
  params: { locale: string };
}) {
  const isArabic = params.locale === "ar";
  const brand = isArabic ? "دعـوتـي" : "Da3witi";
  const tagline = isArabic
    ? "نظام الدعوات الآلي الأول في الخليج"
    : "The First Automated Invitation System in the Gulf";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "72px",
          background:
            "linear-gradient(135deg, #0c0a09 0%, #1c1917 55%, #111827 100%)",
          color: "white",
          letterSpacing: "-0.02em",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "18px",
            maxWidth: 960,
          }}
        >
          <div
            style={{
              fontSize: 82,
              fontWeight: 800,
              lineHeight: 1,
              direction: isArabic ? "rtl" : "ltr",
            }}
          >
            {brand}
          </div>
          <div
            style={{
              fontSize: 34,
              fontWeight: 500,
              opacity: 0.85,
              direction: isArabic ? "rtl" : "ltr",
            }}
          >
            {tagline}
          </div>
          <div
            style={{
              marginTop: 18,
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              opacity: 0.9,
              direction: isArabic ? "rtl" : "ltr",
            }}
          >
            <span
              style={{
                padding: "10px 14px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.10)",
                border: "1px solid rgba(255,255,255,0.18)",
                fontSize: 22,
                fontWeight: 600,
              }}
            >
              WhatsApp
            </span>
            <span
              style={{
                padding: "10px 14px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.10)",
                border: "1px solid rgba(255,255,255,0.18)",
                fontSize: 22,
                fontWeight: 600,
              }}
            >
              RSVP
            </span>
            <span
              style={{
                padding: "10px 14px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.10)",
                border: "1px solid rgba(255,255,255,0.18)",
                fontSize: 22,
                fontWeight: 600,
              }}
            >
              QR
            </span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

