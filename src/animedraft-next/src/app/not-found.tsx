import Link from "next/link";

export default function NotFound() {
  return (
    <div className="narrow center" style={{ paddingTop: 40 }}>
      <h1 className="page-title">Lost in another dimension</h1>
      <p className="muted">That page doesn&apos;t exist.</p>
      <Link className="btn" href="/">
        Back home
      </Link>
    </div>
  );
}
