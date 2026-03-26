import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(circle at top, #1f2937 0%, #09090b 70%)",
          color: "white",
          fontSize: 164,
          fontWeight: 900,
          letterSpacing: -12,
        }}
      >
        <div
          style={{
            height: 320,
            width: 320,
            borderRadius: 80,
            border: "16px solid rgba(16,185,129,0.35)",
            background: "linear-gradient(180deg, rgba(16,185,129,0.2), rgba(16,185,129,0.08))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 80px rgba(16,185,129,0.25)",
          }}
        >
          S
        </div>
      </div>
    ),
    size,
  );
}
