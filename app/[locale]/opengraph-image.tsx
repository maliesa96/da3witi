import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function OpenGraphImage({
  params,
}: {
  params: { locale: string };
}) {
  const isArabic = params.locale === "ar";
  const brand = isArabic ? "دعـوتـي" : "Da3witi";
  const tagline = isArabic
    ? "نظام الدعوات الآلي الأول في الخليج"
    : "The First Automated Invitation System in the Gulf";

  const pills = isArabic
    ? ["واتساب", "تأكيد حضور", "QR"]
    : ["WhatsApp", "RSVP", "QR Code"];

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
            top: "-120px",
            right: "-80px",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(233,228,249,0.7) 0%, rgba(233,228,249,0) 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-100px",
            left: "-60px",
            width: "450px",
            height: "450px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(254,243,199,0.6) 0%, rgba(254,243,199,0) 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "55%",
            width: "350px",
            height: "350px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(227,232,201,0.4) 0%, rgba(227,232,201,0) 70%)",
          }}
        />

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            maxWidth: "960px",
            position: "relative",
          }}
        >
          <div
            style={{
              fontSize: 78,
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
              fontSize: 32,
              fontWeight: 400,
              color: "#78716c",
              lineHeight: 1.3,
              direction: isArabic ? "rtl" : "ltr",
            }}
          >
            {tagline}
          </div>

          {/* Pill badges */}
          <div
            style={{
              marginTop: "20px",
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
              direction: isArabic ? "rtl" : "ltr",
            }}
          >
            {pills.map((pill) => (
              <span
                key={pill}
                style={{
                  padding: "10px 20px",
                  borderRadius: "999px",
                  background: "white",
                  border: "1.5px solid #e7e5e4",
                  fontSize: 20,
                  fontWeight: 600,
                  color: "#44403c",
                  boxShadow: "0 1px 3px rgba(28,25,23,0.06)",
                }}
              >
                {pill}
              </span>
            ))}
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
