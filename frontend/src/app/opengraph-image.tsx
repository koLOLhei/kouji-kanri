import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "KAMO construction - 工事の見える化で安心を届ける";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #0c4a6e 0%, #0369a1 50%, #075985 100%)",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background grid decoration */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        {/* Top-right circle accent */}
        <div
          style={{
            position: "absolute",
            top: "-120px",
            right: "-120px",
            width: "480px",
            height: "480px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.06)",
          }}
        />
        {/* Bottom-left circle accent */}
        <div
          style={{
            position: "absolute",
            bottom: "-100px",
            left: "-100px",
            width: "360px",
            height: "360px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.06)",
          }}
        />

        {/* Logo / Brand */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "18px",
            marginBottom: "28px",
          }}
        >
          <div
            style={{
              width: "80px",
              height: "80px",
              background: "rgba(255,255,255,0.15)",
              borderRadius: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid rgba(255,255,255,0.35)",
            }}
          >
            <span style={{ fontSize: "42px" }}>🏠</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                fontSize: "38px",
                fontWeight: "800",
                color: "white",
                letterSpacing: "-0.5px",
                lineHeight: 1.1,
              }}
            >
              KAMO construction
            </span>
            <span
              style={{
                fontSize: "16px",
                color: "rgba(186,230,253,0.9)",
                marginTop: "4px",
                letterSpacing: "2px",
              }}
            >
              創業1994年 ・ 建設業許可8業種
            </span>
          </div>
        </div>

        {/* Main heading */}
        <h1
          style={{
            fontSize: "58px",
            fontWeight: "900",
            color: "white",
            textAlign: "center",
            lineHeight: 1.25,
            margin: "0 0 20px 0",
            padding: "0 60px",
            textShadow: "0 2px 12px rgba(0,0,0,0.3)",
          }}
        >
          工事の見える化で
          <br />
          安心を届ける
        </h1>

        {/* Description */}
        <p
          style={{
            fontSize: "24px",
            color: "rgba(186,230,253,1)",
            textAlign: "center",
            margin: "0 0 36px 0",
            padding: "0 80px",
            lineHeight: 1.5,
          }}
        >
          リアルタイム写真共有 ・ 報告書自動生成 ・ 工程進捗の透明化
        </p>

        {/* Feature pills */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {[
            "📷 工事写真共有",
            "📄 書類自動生成",
            "📱 スマホ対応",
            "🏢 管理組合向け",
          ].map((item) => (
            <div
              key={item}
              style={{
                background: "rgba(255,255,255,0.15)",
                border: "1px solid rgba(255,255,255,0.3)",
                borderRadius: "50px",
                padding: "10px 26px",
                color: "white",
                fontSize: "20px",
                fontWeight: "600",
              }}
            >
              {item}
            </div>
          ))}
        </div>

        {/* Domain label */}
        <div
          style={{
            position: "absolute",
            bottom: "32px",
            right: "48px",
            color: "rgba(147,197,253,0.9)",
            fontSize: "18px",
            fontWeight: "500",
          }}
        >
          kouji.soara-mu.jp
        </div>

        {/* Left bottom: kamo site */}
        <div
          style={{
            position: "absolute",
            bottom: "32px",
            left: "48px",
            color: "rgba(147,197,253,0.9)",
            fontSize: "18px",
            fontWeight: "500",
          }}
        >
          kamo.soara-mu.jp
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
