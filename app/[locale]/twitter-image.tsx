import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = {
  width: 1200,
  height: 600,
};

export const contentType = "image/png";

export default async function TwitterImage({
  params,
}: {
  params: { locale: string };
}) {
  const isArabic = params.locale === "ar";
  const brand = isArabic ? "دعـوتـي" : "Da3witi";
  const tagline = isArabic
    ? "دعوات واتساب فاخرة خلال دقائق"
    : "Luxury WhatsApp invitations in minutes";

  const [fontRegular, fontBold] = await Promise.all([
    fetch(
      new URL(
        "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf"
      )
    ).then((res) => res.arrayBuffer()),
    fetch(
      new URL(
        "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYMZhrib2Bg-4.ttf"
      )
    ).then((res) => res.arrayBuffer()),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "72px 80px",
          backgroundColor: "#FDFCF8",
          position: "relative",
          overflow: "hidden",
          fontFamily: "Inter",
        }}
      >
        {/* Decorative blobs */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            right: "-60px",
            width: "460px",
            height: "460px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(233,228,249,0.7) 0%, rgba(233,228,249,0) 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-80px",
            left: "-40px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(254,243,199,0.6) 0%, rgba(254,243,199,0) 70%)",
          }}
        />

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "18px",
            maxWidth: "960px",
            position: "relative",
          }}
        >
          <div
            style={{
              fontSize: 74,
              fontWeight: 800,
              lineHeight: 1,
              color: "#1c1917",
              letterSpacing: "-0.04em",
              direction: isArabic ? "rtl" : "ltr",
            }}
          >
            {brand}
          </div>
          <div
            style={{
              fontSize: 30,
              fontWeight: 400,
              color: "#78716c",
              lineHeight: 1.3,
              direction: isArabic ? "rtl" : "ltr",
            }}
          >
            {tagline}
          </div>
        </div>

        {/* Bottom accent line */}
        <div
          style={{
            position: "absolute",
            bottom: "0",
            left: "0",
            right: "0",
            height: "4px",
            background:
              "linear-gradient(90deg, #E9E4F9 0%, #FEF3C7 50%, #E3E8C9 100%)",
          }}
        />
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Inter", data: fontRegular, weight: 400, style: "normal" },
        { name: "Inter", data: fontBold, weight: 800, style: "normal" },
      ],
    }
  );
}
