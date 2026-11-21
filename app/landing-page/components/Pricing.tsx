import { cn } from "@/lib/utils";
import { Btn, Mono, SectionHead, WRAP } from "./parts";
import Reveal from "./Reveal";

const MONTHLY_PRICE = 5;
const YEARLY_PRICE = Math.round(MONTHLY_PRICE * 12 * 0.8); // 20% off

const plans = [
  {
    name: "Free",
    price: "$0",
    note: "no account needed",
    items: [
      "Graph view and code editor",
      "Search and node inspector",
      "Autosave in your browser",
      "Small files",
    ],
    cta: { label: "Open the editor", href: "/editor" },
  },
  {
    name: "Pro",
    price: `$${MONTHLY_PRICE}`,
    period: "/ month",
    note: `or $${YEARLY_PRICE} / year`,
    items: [
      "Everything in Free",
      "No size limits",
      "Export as PNG, JPG and SVG",
      "JSON from images",
    ],
    cta: { label: "Upgrade to Pro", href: "/pricing" },
    highlight: true,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className={`${WRAP} scroll-mt-20 pt-[104px]`}>
      <Reveal>
        <SectionHead label="03 / Pricing">
          Free to use. Pro when the files get big.
        </SectionHead>
        <div className="grid gap-4 md:grid-cols-2">
          {plans.map((p) => (
            <div
              key={p.name}
              className={cn(
                "rounded-xl border p-[30px]",
                p.highlight
                  ? "border-vf-acc bg-[linear-gradient(180deg,rgba(200,241,105,0.05),transparent_40%)]"
                  : "border-vf-rule"
              )}
            >
              <Mono className={p.highlight ? "text-vf-acc" : undefined}>
                {p.name}
              </Mono>
              <div className="mb-1 mt-3.5 text-[46px] font-semibold leading-none tracking-[-0.04em]">
                {p.price}
                {p.period && (
                  <small className="ml-2 text-[15px] font-normal tracking-normal text-vf-dim">
                    {p.period}
                  </small>
                )}
              </div>
              <Mono>{p.note}</Mono>
              <ul className="mb-[26px] mt-[22px]">
                {p.items.map((item) => (
                  <li
                    key={item}
                    className="border-t border-vf-rule py-[9px] text-[15px] text-vf-soft"
                  >
                    <span className="mr-3 font-vf-mono text-vf-acc">+</span>
                    {item}
                  </li>
                ))}
              </ul>
              <Btn
                href={p.cta.href}
                variant={p.highlight ? "solid" : "line"}
              >
                {p.cta.label}
              </Btn>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
