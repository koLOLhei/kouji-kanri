import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "工事管理SaaS - 公共工事の施工管理アプリ";
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
          background: "linear-gradient(135deg, #1e40af 0%, #3730a3 50%, #1e3a8a 100%)",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Background decoration */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            right: "-100px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.05)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-80px",
            left: "-80px",
            width: "300px",
            height: "300px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.05)",
          }}
        />

        {/* Logo area */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              width: "72px",
              height: "72px",
              background: "rgba(255,255,255,0.15)",
              borderRadius: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid rgba(255,255,255,0.3)",
            }}
          >
            <span style={{ fontSize: "36px" }}>🏗️</span>
          </div>
          <span
            style={{
              fontSize: "36px",
              fontWeight: "800",
              color: "white",
              letterSpacing: "-1px",
            }}
          >
            工事管理SaaS
          </span>
        </div>

        {/* Main heading */}
        <h1
          style={{
            fontSize: "60px",
            fontWeight: "900",
            color: "white",
            textAlign: "center",
            lineHeight: 1.2,
            margin: "0 0 24px 0",
            padding: "0 60px",
          }}
        >
          現場の書類地獄から
          <br />
          解放します。
        </h1>

        {/* Description */}
        <p
          style={{
            fontSize: "26px",
            color: "rgba(191,219,254,1)",
            textAlign: "center",
            margin: "0 0 40px 0",
          }}
        >
          写真管理・書類自動生成・電子納品 | 無料から使える
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
            "📷 工事写真管理",
            "📄 書類自動生成",
            "📦 電子納品対応",
            "📱 スマホ対応PWA",
          ].map((item) => (
            <div
              key={item}
              style={{
                background: "rgba(255,255,255,0.15)",
                border: "1px solid rgba(255,255,255,0.3)",
                borderRadius: "50px",
                padding: "10px 24px",
                color: "white",
                fontSize: "20px",
                fontWeight: "600",
              }}
            >
              {item}
            </div>
          ))}
        </div>

        {/* Domain */}
        <div
          style={{
            position: "absolute",
            bottom: "32px",
            right: "48px",
            color: "rgba(147,197,253,1)",
            fontSize: "18px",
          }}
        >
          kouji.soara-mu.jp
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
