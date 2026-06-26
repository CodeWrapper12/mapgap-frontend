import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Contour } from "@/components/ui";

const MARQUEE = ["Clean Architecture", "DDD", "CQRS", "Kafka", "Terraform", "gRPC", "Azure", "Kubernetes", "MediatR", "Saga"];

export default function Home() {
  return (
    <section className="hero">
      <Contour />
      <div className="hero-inner">
        <p className="eyebrow">Honest CV tailoring</p>
        <h1 className="display">
          <span className="line"><span style={{ ["--d" as string]: "90ms" }}>Match the job.</span></span>
          <span className="line"><span className="ital" style={{ ["--d" as string]: "230ms" }}>Tell the truth.</span></span>
        </h1>
        <p className="lede rise" style={{ ["--d" as string]: "420ms" }}>
          GapMap reads a job description against your real experience &mdash; showing where you match,
          where your CV hides your strengths, and which gaps are worth closing. It never invents a thing.
        </p>
        <div className="rise" style={{ ["--d" as string]: "560ms" }}>
          <Link href="/login" className="btn lg">Get started <ArrowRight size={17} strokeWidth={2} /></Link>
          <p className="undertext">Invite-only. You&rsquo;ll need a voucher to create an account.</p>
        </div>
      </div>
      <div className="marquee rise" style={{ ["--d" as string]: "700ms" }} aria-hidden>
        <div className="marquee-track">
          {[...MARQUEE, ...MARQUEE].map((m, i) => <span key={i}>{m}<i>/</i></span>)}
        </div>
      </div>
    </section>
  );
}
