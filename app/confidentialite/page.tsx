export const metadata = { title: "Politique de confidentialité — Aubaines QC" };

export default function Page() {
  return (
    <article className="legal">
      <p className="notice">
        <strong>Ébauche à faire valider par un juriste avant le lancement.</strong> Complétez les champs entre
        crochets [ ] (nom de l'entreprise, responsable de la protection des renseignements personnels, adresse).
      </p>
      <h1>Politique de confidentialité</h1>
      <p>Dernière mise à jour : [DATE]</p>

      <h2>1. Qui sommes-nous ?</h2>
      <p>Aubaines QC est exploité par [NOM LÉGAL DE L'ENTREPRISE], [ADRESSE]. La personne responsable de la protection des renseignements personnels est [NOM], joignable à [COURRIEL].</p>

      <h2>2. Renseignements que nous recueillons</h2>
      <ul>
        <li><strong>Compte :</strong> prénom, courriel, mot de passe (conservé uniquement sous forme chiffrée irréversible).</li>
        <li><strong>Utilisation :</strong> vos favoris et vos alertes (mots-clés, catégories, établissements).</li>
        <li><strong>Commerçants :</strong> nom de l'entreprise, site web, téléphone et message fournis dans la demande, ainsi que les offres publiées.</li>
        <li><strong>Technique :</strong> adresse IP, utilisée temporairement pour limiter les abus (tentatives de connexion et d'inscription) ; un témoin de session strictement nécessaire au fonctionnement du site.</li>
      </ul>

      <h2>3. Pourquoi nous les utilisons</h2>
      <p>Pour créer et sécuriser votre compte, afficher vos favoris, vous envoyer les courriels que vous avez demandés (confirmation, réinitialisation du mot de passe, alertes et rappels) et administrer le portail commerçant. Nous ne vendons pas vos renseignements personnels.</p>

      <h2>4. Courriels</h2>
      <p>Les courriels d'alertes ne sont envoyés qu'après la création d'une alerte par vous. Chaque courriel contient un lien de désabonnement immédiat.</p>

      <h2>5. Partage avec des tiers</h2>
      <p>Nous faisons appel à des fournisseurs de services pour l'hébergement ([FOURNISSEUR, PAYS]), la base de données ([FOURNISSEUR, PAYS]) et l'envoi de courriels ([FOURNISSEUR, PAYS]). Ces fournisseurs peuvent traiter vos renseignements hors du Québec ; nous prenons les mesures contractuelles appropriées.</p>

      <h2>6. Durée de conservation</h2>
      <p>Nous conservons vos renseignements tant que votre compte est actif. À la suppression du compte, ils sont effacés, sous réserve des obligations légales.</p>

      <h2>7. Vos droits</h2>
      <p>Vous pouvez demander l'accès à vos renseignements, leur rectification, leur suppression, ou retirer votre consentement en écrivant à [COURRIEL]. Vous pouvez aussi vous plaindre à la Commission d'accès à l'information du Québec.</p>

      <h2>8. Incidents de confidentialité</h2>
      <p>En cas d'incident présentant un risque de préjudice sérieux, nous aviserons les personnes concernées et la Commission d'accès à l'information, conformément à la loi.</p>

      <h2>9. Modifications</h2>
      <p>Nous pouvons modifier cette politique ; la date de mise à jour ci-dessus fait foi.</p>
    </article>
  );
}
