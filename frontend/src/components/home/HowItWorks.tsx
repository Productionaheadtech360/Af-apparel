import { EditIcon, ClipboardIcon, TruckIcon, RefreshIcon } from "@/components/ui/icons";

export default function HowItWorks() {
  const steps = [
    { n: "01", icon: <EditIcon size={30} color="#2A2830" />, h: "Apply for Access", p: "Submit your business details. Free to apply. Approved within 24 hours. No commitment required." },
    { n: "02", icon: <ClipboardIcon size={30} color="#2A2830" />, h: "Browse & Build Order", p: "Select colors, enter quantities across sizes. Real-time stock and pricing shown in your account." },
    { n: "03", icon: <TruckIcon size={30} color="#2A2830" />, h: "Checkout & Ship", p: "Pay via card, ACH, wire, or NET 30. Orders before 2 PM CT ship from Dallas same day." },
    { n: "04", icon: <RefreshIcon size={30} color="#2A2830" />, h: "Reorder Easily", p: "Full order history saved in your account. Reorder a previous color breakdown in one click." },
  ];

  return (
    <section style={{ padding: "80px 0", background: "#F4F3EF" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 32px" }}>
        <div style={{ marginBottom: "44px", textAlign: "center" }}>
          <h2 style={{ fontFamily: "var(--font-bebas)", fontSize: "clamp(32px,3.5vw,48px)", color: "#2A2830", letterSpacing: ".01em", lineHeight: 1, marginBottom: "10px" }}>How It Works</h2>
          <p style={{ fontSize: "15px", color: "#7A7880", fontWeight: 500 }}>Wholesale ordering in 4 simple steps</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", background: "#fff", border: "1px solid #E2E0DA", borderRadius: "12px", overflow: "hidden" }} className="steps-grid-responsive">
          {steps.map((step, i) => (
            <div key={step.n} style={{ padding: "36px 28px", borderRight: i < 3 ? "1px solid #E2E0DA" : "none" }}>
              <div style={{ fontFamily: "var(--font-bebas)", fontSize: "48px", color: "#e8242a", lineHeight: 1, marginBottom: "6px" }}>{step.n}</div>
              <div style={{ marginBottom: "12px" }}>{step.icon}</div>
              <h4 style={{ fontFamily: "var(--font-bebas)", fontSize: "17px", letterSpacing: ".03em", marginBottom: "8px", color: "#2A2830" }}>{step.h}</h4>
              <p style={{ fontSize: "15px", color: "#7A7880", lineHeight: 1.65, fontWeight: 500 }}>{step.p}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
