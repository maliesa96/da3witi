import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = {
  width: 1200,
  height: 600,
};

export const contentType = "image/png";

export default function TwitterImage({
  params,
}: {
  params: { locale: string };
}) {
  const isArabic = params.locale === "ar";
  const brand = isArabic ? "دعـوتـي" : "Da3witi";
  const tagline = isArabic
    ? "دعوات واتساب فاخرة خلال دقائق"
    : "Luxury WhatsApp invitations in minutes";

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
            "linear-gradient(135deg, #111827 0%, #1c1917 55%, #0c0a09 100%)",
          color: "white",
          letterSpacing: "-0.02em",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            maxWidth: 980,
          }}
        >
          <div
            style={{
              fontSize: 78,
              fontWeight: 800,
              lineHeight: 1,
              direction: isArabic ? "rtl" : "ltr",
            }}
          >
            {brand}
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 500,
              opacity: 0.88,
              direction: isArabic ? "rtl" : "ltr",
            }}
          >
            {tagline}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

