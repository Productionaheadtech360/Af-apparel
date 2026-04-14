import { FactoryIcon, MapPinIcon, AwardIcon, LeafIcon, PackageIcon, ZapIcon } from "@/components/ui/icons";

const items = [
  { Icon: FactoryIcon, text: "Factory-Direct" },
  { Icon: MapPinIcon,  text: "Dallas, TX" },
  { Icon: AwardIcon,   text: "ISO 9000" },
  { Icon: LeafIcon,    text: "GOTS & Oeko-Tex" },
  { Icon: PackageIcon, text: "No Minimums" },
  { Icon: ZapIcon,     text: "Same-Day Shipping" },
];

export default function TrustStrip() {
  return (
    <div style={{ background: "#fff", borderBottom: "1px solid #E2E0DA", padding: "18px 0" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 32px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        {items.map(({ Icon, text }) => (
          <div key={text} style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: "140px", justifyContent: "center", padding: "6px 12px" }}>
            <Icon size={18} color="#2A2830" />
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#2A2830", textTransform: "uppercase", letterSpacing: ".05em" }}>{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
