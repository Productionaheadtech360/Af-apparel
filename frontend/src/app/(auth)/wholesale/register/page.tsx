"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authService } from "@/services/auth.service";
import { ApiClientError } from "@/lib/api-client";
import { FactoryIcon, PackageIcon, ZapIcon, PaletteIcon, CreditCardIcon, UsersIcon } from "@/components/ui/icons";

const PRIMARY_BUSINESS_OPTIONS = [
  "Screen Printer",
  "Embroiderer",
  "Promotional Products Distributor",
  "Retailer",
  "Online Retailer",
  "Corporate Buyer",
  "Athletic Team Dealer",
  "Boutique",
  "Decorator",
  "Other",
];

const HEAR_ABOUT_OPTIONS = [
  "Google Search",
  "Social Media",
  "Trade Show",
  "Referral from Another Business",
  "Email Campaign",
  "Industry Publication",
  "Other",
];

const EMPLOYEE_OPTIONS = [
  "1 – 5",
  "6 – 10",
  "11 – 25",
  "26 – 50",
  "51 – 100",
  "100+",
];

const SALES_REP_OPTIONS = [
  "0",
  "1 – 2",
  "3 – 5",
  "6 – 10",
  "10+",
];

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #E2E0DA",
  borderRadius: "6px",
  padding: "10px 14px",
  fontSize: "14px",
  color: "#2A2830",
  background: "#fff",
  outline: "none",
  transition: "border-color .2s",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "11px",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: ".07em",
  color: "#7A7880",
  marginBottom: "6px",
};

const sectionHeadStyle: React.CSSProperties = {
  fontFamily: "var(--font-bebas)",
  fontSize: "16px",
  letterSpacing: ".06em",
  color: "#2A2830",
  marginBottom: "20px",
  paddingBottom: "10px",
  borderBottom: "1px solid #E2E0DA",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "16px",
};

const req = <span style={{ color: "#E8242A" }}>*</span>;

export default function WholesaleRegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    // Company Information
    company_name: "",
    website: "",
    company_email: "",
    address1: "",
    address2: "",
    postal_code: "",
    country: "",
    city: "",
    state: "",
    resale_number: "",
    ppai_number: "",
    asi_number: "",
    phone: "",
    fax: "",
    // Contact Information
    first_name: "",
    last_name: "",
    title: "",
    email: "",
    // Business Information
    primary_business: "",
    secondary_business: "",
    how_heard: "",
    num_employees: "",
    num_sales_reps: "",
    // Web Account Information
    password: "",
    confirm_password: "",
    password_hint: "",
    // Communication
    promo_emails: false,
    // Terms
    terms_accepted: false,
    captcha_checked: false,
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.password !== form.confirm_password) {
      setError("Passwords do not match.");
      return;
    }
    if (!form.terms_accepted) {
      setError("You must accept the terms and conditions.");
      return;
    }
    if (!form.captcha_checked) {
      setError("Please confirm you are not a robot.");
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.registerWholesale({
        company_name: form.company_name,
        business_type: form.primary_business,
        tax_id: form.resale_number,
        website: form.website,
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone,
        password: form.password,
      });
      router.push("/wholesale/pending");
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.code === "CONFLICT") {
          setError("An account with this email already exists. Please log in.");
        } else {
          setError(err.message);
        }
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F4F3EF", fontFamily: "var(--font-jakarta)" }}>
      {/* Page header */}
      <div style={{ background: "#080808", padding: "32px", textAlign: "center", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none", marginBottom: "16px" }}>
          <img src="/Af-apparel logo.jpeg" alt="AF Apparels Logo" style={{ height: "55px", width: "auto", objectFit: "contain" }} />
        </Link>
        <h1 style={{ fontFamily: "var(--font-bebas)", fontSize: "clamp(28px,3vw,42px)", color: "#fff", letterSpacing: ".02em", lineHeight: 1, marginBottom: "8px" }}>
          Apply for Wholesale Access
        </h1>
        <p style={{ fontSize: "14px", color: "#555", maxWidth: "460px", margin: "0 auto" }}>
          Free to apply. Approved within 24 hours. No commitment required.
        </p>
      </div>

      {/* Content */}
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "48px 32px", display: "grid", gridTemplateColumns: "1fr 340px", gap: "28px", alignItems: "flex-start" }} className="register-grid-responsive">

        {/* Form card */}
        <div style={{ background: "#fff", border: "1px solid #E2E0DA", borderRadius: "12px", padding: "40px" }}>
          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{ background: "#FFF0F0", border: "1px solid #fcc", borderRadius: "6px", padding: "12px 16px", fontSize: "13px", color: "#c0392b", marginBottom: "24px" }}>
                {error}
              </div>
            )}

            {/* ── Company Information ── */}
            <div style={{ marginBottom: "32px" }}>
              <h3 style={sectionHeadStyle}>Company Information</h3>
              <div style={gridStyle}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label htmlFor="company_name" style={labelStyle}>Company Name {req}</label>
                  <input id="company_name" name="company_name" type="text" required value={form.company_name} onChange={handleChange} style={inputStyle} placeholder="Your Company LLC" />
                </div>

                <div>
                  <label htmlFor="website" style={labelStyle}>Website <span style={{ color: "#aaa", fontWeight: 400, textTransform: "none" }}>(optional)</span></label>
                  <input id="website" name="website" type="url" value={form.website} onChange={handleChange} placeholder="https://" style={inputStyle} />
                </div>

                <div>
                  <label htmlFor="company_email" style={labelStyle}>Company Email {req}</label>
                  <input id="company_email" name="company_email" type="email" required value={form.company_email} onChange={handleChange} placeholder="info@yourcompany.com" style={inputStyle} />
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label htmlFor="address1" style={labelStyle}>Address 1 {req}</label>
                  <input id="address1" name="address1" type="text" required value={form.address1} onChange={handleChange} placeholder="Street address" style={inputStyle} />
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label htmlFor="address2" style={labelStyle}>Address 2 <span style={{ color: "#aaa", fontWeight: 400, textTransform: "none" }}>(optional)</span></label>
                  <input id="address2" name="address2" type="text" value={form.address2} onChange={handleChange} placeholder="Suite, unit, building…" style={inputStyle} />
                </div>

                <div>
                  <label htmlFor="postal_code" style={labelStyle}>Postal / Zip Code {req}</label>
                  <input id="postal_code" name="postal_code" type="text" required value={form.postal_code} onChange={handleChange} placeholder="75001" style={inputStyle} />
                </div>

                <div>
                  <label htmlFor="country" style={labelStyle}>Country {req}</label>
                  <input id="country" name="country" type="text" required value={form.country} onChange={handleChange} placeholder="United States" style={inputStyle} />
                </div>

                <div>
                  <label htmlFor="city" style={labelStyle}>City {req}</label>
                  <input id="city" name="city" type="text" required value={form.city} onChange={handleChange} style={inputStyle} />
                </div>

                <div>
                  <label htmlFor="state" style={labelStyle}>Province / State {req}</label>
                  <input id="state" name="state" type="text" required value={form.state} onChange={handleChange} placeholder="TX" style={inputStyle} />
                </div>

                <div>
                  <label htmlFor="resale_number" style={labelStyle}>RESALE # {req}</label>
                  <input id="resale_number" name="resale_number" type="text" required value={form.resale_number} onChange={handleChange} style={inputStyle} />
                </div>

                <div>
                  <label htmlFor="ppai_number" style={labelStyle}>PPAI # <span style={{ color: "#aaa", fontWeight: 400, textTransform: "none" }}>(optional)</span></label>
                  <input id="ppai_number" name="ppai_number" type="text" value={form.ppai_number} onChange={handleChange} style={inputStyle} />
                </div>

                <div>
                  <label htmlFor="asi_number" style={labelStyle}>ASI # <span style={{ color: "#aaa", fontWeight: 400, textTransform: "none" }}>(optional)</span></label>
                  <input id="asi_number" name="asi_number" type="text" value={form.asi_number} onChange={handleChange} style={inputStyle} />
                </div>

                <div>
                  <label htmlFor="phone" style={labelStyle}>Phone {req}</label>
                  <input id="phone" name="phone" type="tel" required value={form.phone} onChange={handleChange} placeholder="(214) 000-0000" style={inputStyle} />
                </div>

                <div>
                  <label htmlFor="fax" style={labelStyle}>Fax <span style={{ color: "#aaa", fontWeight: 400, textTransform: "none" }}>(optional)</span></label>
                  <input id="fax" name="fax" type="tel" value={form.fax} onChange={handleChange} placeholder="(214) 000-0000" style={inputStyle} />
                </div>
              </div>
            </div>

            {/* ── Contact Information ── */}
            <div style={{ marginBottom: "32px" }}>
              <h3 style={sectionHeadStyle}>Contact Information</h3>
              <div style={gridStyle}>
                <div>
                  <label htmlFor="first_name" style={labelStyle}>First Name {req}</label>
                  <input id="first_name" name="first_name" type="text" required value={form.first_name} onChange={handleChange} style={inputStyle} />
                </div>

                <div>
                  <label htmlFor="last_name" style={labelStyle}>Last Name {req}</label>
                  <input id="last_name" name="last_name" type="text" required value={form.last_name} onChange={handleChange} style={inputStyle} />
                </div>

                <div>
                  <label htmlFor="title" style={labelStyle}>Title <span style={{ color: "#aaa", fontWeight: 400, textTransform: "none" }}>(optional)</span></label>
                  <input id="title" name="title" type="text" value={form.title} onChange={handleChange} placeholder="e.g. Owner, Manager" style={inputStyle} />
                </div>

                <div>
                  <label htmlFor="email" style={labelStyle}>Direct Email Address {req}</label>
                  <input id="email" name="email" type="email" required value={form.email} onChange={handleChange} placeholder="you@company.com" style={inputStyle} />
                </div>
              </div>
            </div>

            {/* ── Business Information ── */}
            <div style={{ marginBottom: "32px" }}>
              <h3 style={sectionHeadStyle}>Business Information</h3>
              <div style={gridStyle}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label htmlFor="primary_business" style={labelStyle}>What is your primary business activity? {req}</label>
                  <select id="primary_business" name="primary_business" required value={form.primary_business} onChange={handleChange} style={inputStyle}>
                    <option value="">Select…</option>
                    {PRIMARY_BUSINESS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label htmlFor="secondary_business" style={labelStyle}>What is your secondary business activity?</label>
                  <select id="secondary_business" name="secondary_business" value={form.secondary_business} onChange={handleChange} style={inputStyle}>
                    <option value="">Select…</option>
                    {PRIMARY_BUSINESS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label htmlFor="how_heard" style={labelStyle}>How did you hear about us?</label>
                  <select id="how_heard" name="how_heard" value={form.how_heard} onChange={handleChange} style={inputStyle}>
                    <option value="">Select…</option>
                    {HEAR_ABOUT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>

                <div>
                  <label htmlFor="num_employees" style={labelStyle}>Number of employees in your location:</label>
                  <select id="num_employees" name="num_employees" value={form.num_employees} onChange={handleChange} style={inputStyle}>
                    <option value="">Select…</option>
                    {EMPLOYEE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>

                <div>
                  <label htmlFor="num_sales_reps" style={labelStyle}>Number of outside sales reps:</label>
                  <select id="num_sales_reps" name="num_sales_reps" value={form.num_sales_reps} onChange={handleChange} style={inputStyle}>
                    <option value="">Select…</option>
                    {SALES_REP_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* ── Web Account Information ── */}
            <div style={{ marginBottom: "32px" }}>
              <h3 style={sectionHeadStyle}>Web Account Information</h3>
              <div style={gridStyle}>
                <div>
                  <label htmlFor="password" style={labelStyle}>Password {req}</label>
                  <input id="password" name="password" type="password" required minLength={8} value={form.password} onChange={handleChange} placeholder="Min. 8 characters" style={inputStyle} />
                </div>

                <div>
                  <label htmlFor="confirm_password" style={labelStyle}>Confirm Password {req}</label>
                  <input id="confirm_password" name="confirm_password" type="password" required minLength={8} value={form.confirm_password} onChange={handleChange} placeholder="Re-enter password" style={inputStyle} />
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label htmlFor="password_hint" style={labelStyle}>Password Hint <span style={{ color: "#aaa", fontWeight: 400, textTransform: "none" }}>(optional)</span></label>
                  <input id="password_hint" name="password_hint" type="text" value={form.password_hint} onChange={handleChange} placeholder="A hint to help you remember your password" style={inputStyle} />
                </div>
              </div>
            </div>

            {/* ── Communication Preferences ── */}
            <div style={{ marginBottom: "32px" }}>
              <h3 style={sectionHeadStyle}>Communication Preferences</h3>
              <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  name="promo_emails"
                  checked={form.promo_emails}
                  onChange={handleChange}
                  style={{ marginTop: "2px", accentColor: "#1A5CFF", width: "16px", height: "16px", flexShrink: 0 }}
                />
                <span style={{ fontSize: "14px", color: "#2A2830", lineHeight: 1.5 }}>
                  I would like to receive promotional emails, product updates, and exclusive offers from AF Apparels.
                </span>
              </label>
            </div>

            {/* ── Terms and Conditions ── */}
            <div style={{ marginBottom: "32px" }}>
              <h3 style={sectionHeadStyle}>Terms and Conditions</h3>
              <p style={{ fontSize: "13px", color: "#4A4850", lineHeight: 1.65, marginBottom: "14px" }}>
                By proceeding I acknowledge that I have read and agree to the following terms and conditions:
              </p>
              <div style={{ background: "#F9F8F5", border: "1px solid #E2E0DA", borderRadius: "8px", padding: "14px 16px", fontSize: "12px", color: "#7A7880", lineHeight: 1.7, marginBottom: "18px", maxHeight: "110px", overflowY: "auto" }}>
                AF Apparels wholesale accounts are strictly for business-to-business transactions. By submitting this application you confirm that your business holds a valid resale certificate or equivalent tax exemption document. All pricing, product availability, and terms are subject to change. Accounts may be suspended for misuse. We reserve the right to approve or deny any application at our sole discretion.
              </div>

              {/* Simulated reCAPTCHA */}
              <div style={{ border: "1px solid #D3D3D3", borderRadius: "4px", background: "#F9F9F9", padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", maxWidth: "300px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", margin: 0 }}>
                  <input
                    type="checkbox"
                    name="captcha_checked"
                    checked={form.captcha_checked}
                    onChange={handleChange}
                    style={{ width: "20px", height: "20px", accentColor: "#4CAF50", flexShrink: 0 }}
                  />
                  <span style={{ fontSize: "14px", color: "#2A2830", fontWeight: 500 }}>I&apos;m not a robot</span>
                </label>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "8px", color: "#999", lineHeight: 1.4 }}>
                    reCAPTCHA<br />
                    <span style={{ fontSize: "7px" }}>Privacy - Terms</span>
                  </div>
                </div>
              </div>

              <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  name="terms_accepted"
                  checked={form.terms_accepted}
                  onChange={handleChange}
                  style={{ marginTop: "2px", accentColor: "#1A5CFF", width: "16px", height: "16px", flexShrink: 0 }}
                />
                <span style={{ fontSize: "13px", color: "#2A2830", lineHeight: 1.5 }}>
                  I have read and agree to the terms and conditions above. {req}
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: "100%",
                background: isSubmitting ? "#ccc" : "#E8242A",
                color: "#fff",
                padding: "14px",
                fontSize: "14px",
                fontWeight: 700,
                borderRadius: "6px",
                border: "none",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                transition: "all .2s",
                letterSpacing: ".04em",
                textTransform: "uppercase",
              }}
            >
              {isSubmitting ? "Submitting Application…" : "Submit Wholesale Application →"}
            </button>

            <p style={{ textAlign: "center", fontSize: "13px", color: "#7A7880", marginTop: "16px" }}>
              Already have an account?{" "}
              <Link href="/login" style={{ color: "#1A5CFF", fontWeight: 600, textDecoration: "none" }}>
                Sign in
              </Link>
            </p>
          </form>
        </div>

        {/* Benefits sidebar */}
        <div style={{ background: "#111016", border: "1px solid rgba(255,255,255,.06)", borderRadius: "12px", padding: "32px", position: "sticky", top: "20px" }}>
          <h3 style={{ fontFamily: "var(--font-bebas)", fontSize: "18px", letterSpacing: ".06em", color: "#fff", marginBottom: "20px" }}>
            Why Apply?
          </h3>
          {[
            { icon: <FactoryIcon size={20} color="#aaa" />, h: "Factory-Direct Pricing", p: "No distributors. Pay factory price — better margins on every order." },
            { icon: <PackageIcon size={20} color="#aaa" />, h: "No Minimums", p: "Order 1 unit or 10,000. In-stock items ship same day from Dallas." },
            { icon: <ZapIcon size={20} color="#aaa" />, h: "Same-Day Shipping", p: "Orders before 2 PM CT ship the same day. Dallas, TX warehouse." },
            { icon: <PaletteIcon size={20} color="#aaa" />, h: "Print-Optimized Blanks", p: "Every fabric tested for DTF, screen printing, and embroidery." },
            { icon: <CreditCardIcon size={20} color="#aaa" />, h: "NET 30 Terms Available", p: "Qualifying accounts can access NET 30 payment terms." },
            { icon: <UsersIcon size={20} color="#aaa" />, h: "Dedicated Support", p: "Real account manager — not a ticket queue. Phone + email." },
          ].map(item => (
            <div key={item.h} style={{ display: "flex", gap: "12px", marginBottom: "18px", alignItems: "flex-start" }}>
              <div style={{ minWidth: "28px", display: "flex", paddingTop: "1px" }}>{item.icon}</div>
              <div>
                <div style={{ fontFamily: "var(--font-bebas)", fontSize: "13px", letterSpacing: ".04em", color: "#ccc", marginBottom: "3px" }}>{item.h}</div>
                <div style={{ fontSize: "12px", color: "#444", lineHeight: 1.55 }}>{item.p}</div>
              </div>
            </div>
          ))}

          <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid rgba(255,255,255,.06)" }}>
            <div style={{ fontSize: "11px", color: "#333", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 700, marginBottom: "10px" }}>Trusted by 2,000+ Businesses</div>
            <div style={{ fontSize: "12px", color: "#444", lineHeight: 1.6 }}>
              Printing companies, retailers, corporate buyers, and apparel brands across the US source direct from AF Apparels.
            </div>
          </div>

          <div style={{ marginTop: "20px", background: "rgba(26,92,255,.08)", border: "1px solid rgba(26,92,255,.15)", borderRadius: "8px", padding: "14px" }}>
            <div style={{ fontSize: "12px", color: "#6B9FFF", fontWeight: 600, marginBottom: "4px" }}>Questions?</div>
            <div style={{ fontSize: "12px", color: "#555" }}>
              (214) 272-7213<br />
              info@afblanks.com
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
