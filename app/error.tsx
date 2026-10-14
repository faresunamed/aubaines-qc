"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="lost">
      <p className="big">Oups</p>
      <h1>Un problème est survenu de notre côté</h1>
      <p>Réessayez dans un instant. Si le problème continue, revenez à l'accueil.</p>
      <button className="btn btn-primary" onClick={() => reset()}>Réessayer</button>{" "}
      <Link href="/" className="btn">Accueil</Link>
    </div>
  );
}
