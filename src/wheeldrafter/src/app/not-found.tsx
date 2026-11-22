import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ maxWidth: 520, margin: "48px auto", textAlign: "center" }}>
      <div className="kicker">404</div>
      <h1 className="page-title">Off the wheel.</h1>
      <p className="lead" style={{ margin: "0 auto 24px" }}>
        That page doesn&apos;t exist.
      </p>
      <Link className="btn" href="/">
        Back home
      </Link>
    </div>
  );
}
